const webPush = require('web-push');
const axios = require('axios');
const { Op } = require('sequelize');

const ApiError = require('../utils/ApiError');
const ClienteService = require('./ClienteService');
const {
  hasClientInConversation
} = require('../utils/conversationPresence');
const {
  Conversation,
  ExpoPushToken,
  PushAlertSubscription,
  PushSubscription,
  User
} = require('../models');

const PUSHALERT_DEFAULT_SEND_URL = 'https://api.pushalert.co/rest/v1/send';
const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const NOTIFICATION_PREVIEW_LIMIT = 120;
const DEFAULT_FRONTEND_URL = 'https://atendimento.sytes.net';

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/$/, '');
}

function getNotificationIconUrl() {
  return `${getFrontendUrl()}/icons/atendimento-192.png`;
}

function isExpoPushToken(value) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(String(value || '').trim());
}

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

class PushService {
  constructor() {
    this.configure();
  }

  configure() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      this.enabled = false;
      return;
    }

    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:suporte@suportesync.local',
      publicKey,
      privateKey
    );
    this.enabled = true;
  }

  getPublicConfig() {
    return {
      enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      publicKey: process.env.VAPID_PUBLIC_KEY || null,
      pushAlertEnabled: Boolean(process.env.PUSHALERT_REST_API_KEY)
    };
  }

  async validateClientConversation(data) {
    const cliente = await ClienteService.findByAccessCode(data.codigo || data.code);
    const conversationId = data.conversation_id || null;

    if (!conversationId) {
      return { cliente, conversationId };
    }

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    if (String(conversation.cliente_id_externo) !== String(cliente.id)) {
      throw new ApiError('Codigo de acesso nao pertence a esta conversa', 403);
    }

    return { cliente, conversationId };
  }

  async subscribe(data, userAgent = null) {
    const { cliente, conversationId } = await this.validateClientConversation(data);
    const subscription = data.subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new ApiError('Assinatura push invalida', 422);
    }

    const [record] = await PushSubscription.findOrCreate({
      where: {
        endpoint: subscription.endpoint
      },
      defaults: {
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent
      });
    }

    return {
      success: true
    };
  }

  async subscribeAdmin(data, user, userAgent = null) {
    const subscription = data.subscription;

    if (!user) {
      throw new ApiError('JWT obrigatorio para assinar notificacoes do painel', 401);
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new ApiError('Assinatura push invalida', 422);
    }

    const [record] = await PushSubscription.findOrCreate({
      where: {
        endpoint: subscription.endpoint
      },
      defaults: {
        cliente_id_externo: null,
        user_id: user.id,
        conversation_id: null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        user_id: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent
      });
    }

    return {
      success: true
    };
  }

  async subscribePushAlert(data, userAgent = null) {
    const { cliente, conversationId } = await this.validateClientConversation(data);
    const subscriberId = String(data.subscriber_id || data.subscriberId || '').trim();

    if (!subscriberId) {
      throw new ApiError('subscriber_id e obrigatorio', 422);
    }

    const [record] = await PushAlertSubscription.findOrCreate({
      where: {
        subscriber_id: subscriberId
      },
      defaults: {
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId,
        subscriber_id: subscriberId,
        user_agent: userAgent
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId,
        user_agent: userAgent
      });
    }

    return {
      success: true
    };
  }

  async subscribeAdminPushAlert(data, user, userAgent = null) {
    if (!user) {
      throw new ApiError('JWT obrigatorio para assinar PushAlert do painel', 401);
    }

    const subscriberId = String(data.subscriber_id || data.subscriberId || '').trim();

    if (!subscriberId) {
      throw new ApiError('subscriber_id e obrigatorio', 422);
    }

    const [record] = await PushAlertSubscription.findOrCreate({
      where: {
        subscriber_id: subscriberId
      },
      defaults: {
        cliente_id_externo: null,
        user_id: user.id,
        conversation_id: null,
        subscriber_id: subscriberId,
        user_agent: userAgent
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        user_id: user.id,
        user_agent: userAgent
      });
    }

    return {
      success: true
    };
  }

  async subscribeAdminExpo(data, user, userAgent = null) {
    if (!user) {
      throw new ApiError('JWT obrigatorio para registrar notificacoes mobile', 401);
    }

    const token = String(data.token || data.expo_push_token || data.expoPushToken || '').trim();

    if (!isExpoPushToken(token)) {
      throw new ApiError('Expo push token invalido', 422);
    }

    const [record] = await ExpoPushToken.findOrCreate({
      where: { token },
      defaults: {
        user_id: user.id,
        token,
        platform: data.platform || null,
        device_name: data.device_name || data.deviceName || null,
        user_agent: userAgent,
        last_registered_at: new Date()
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        user_id: user.id,
        platform: data.platform || record.platform,
        device_name: data.device_name || data.deviceName || record.device_name,
        user_agent: userAgent,
        last_registered_at: new Date()
      });
    }

    return {
      success: true
    };
  }

  async subscribeClientExpo(data, userAgent = null) {
    const { cliente, conversationId } = await this.validateClientConversation(data);
    const token = String(data.token || data.expo_push_token || data.expoPushToken || '').trim();

    if (!isExpoPushToken(token)) {
      throw new ApiError('Expo push token invalido', 422);
    }

    const [record] = await ExpoPushToken.findOrCreate({
      where: { token },
      defaults: {
        user_id: null,
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId,
        token,
        platform: data.platform || null,
        device_name: data.device_name || data.deviceName || null,
        user_agent: userAgent,
        last_registered_at: new Date()
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        user_id: null,
        cliente_id_externo: String(cliente.id),
        conversation_id: conversationId || record.conversation_id,
        platform: data.platform || record.platform,
        device_name: data.device_name || data.deviceName || record.device_name,
        user_agent: userAgent,
        last_registered_at: new Date()
      });
    }

    console.log('Expo push cliente registrado', {
      cliente_id_externo: String(cliente.id),
      conversation_id: conversationId,
      token: token.slice(0, 32),
      platform: data.platform || null
    });

    return {
      success: true
    };
  }
  async unsubscribe(data) {
    const endpoint = data.endpoint || data.subscription?.endpoint;

    if (!endpoint) {
      throw new ApiError('endpoint e obrigatorio', 422);
    }

    await PushSubscription.destroy({
      where: {
        endpoint
      }
    });

    return {
      success: true
    };
  }

  buildNotificationData(message, conversation) {
    const textPreview = String(message.message || '')
      .replace(/\s+/g, ' ')
      .trim();
    const attachmentPreview =
      message.message_type === 'IMAGE'
        ? 'Enviou uma imagem'
        : message.message_type === 'AUDIO'
          ? 'Enviou um audio'
          : message.message_type === 'FILE'
            ? 'Enviou um arquivo'
            : 'Enviou uma mensagem';
    const body =
      textPreview.length > NOTIFICATION_PREVIEW_LIMIT
        ? `${textPreview.slice(0, NOTIFICATION_PREVIEW_LIMIT - 1)}...`
        : textPreview || attachmentPreview;
    const frontendUrl = getFrontendUrl();
    const url = `${frontendUrl}/chat`;
    const iconUrl = getNotificationIconUrl();

    return {
      title: 'Nova resposta do suporte',
      body,
      url,
      conversation_id: conversation.id,
      icon: iconUrl,
      badge: iconUrl
    };
  }

  async buildAdminNotificationData(message, conversation) {
    const textPreview = String(message.message || '')
      .replace(/\s+/g, ' ')
      .trim();
    const attachmentPreview =
      message.message_type === 'IMAGE'
        ? 'Cliente enviou uma imagem'
        : message.message_type === 'AUDIO'
          ? 'Cliente enviou um audio'
          : message.message_type === 'FILE'
            ? 'Cliente enviou um arquivo'
            : 'Cliente enviou uma mensagem';
    const body =
      textPreview.length > NOTIFICATION_PREVIEW_LIMIT
        ? `${textPreview.slice(0, NOTIFICATION_PREVIEW_LIMIT - 1)}...`
        : textPreview || attachmentPreview;
    const frontendUrl = getFrontendUrl();
    const url = `${frontendUrl}/dashboard?tab=chats`;
    const iconUrl = getNotificationIconUrl();
    let cliente = null;

    try {
      cliente = await ClienteService.findById(conversation.cliente_id_externo);
    } catch {
      cliente = null;
    }

    const clienteLabel =
      cliente?.referencia ||
      cliente?.usuario_referencia ||
      cliente?.nome ||
      conversation.cliente_id_externo ||
      'Cliente';

    return {
      title: `${clienteLabel} mandou mensagem`,
      body,
      url,
      conversation_id: conversation.id,
      icon: iconUrl,
      badge: iconUrl
    };
  }

  buildBroadcastNotificationData(notice, conversation) {
    const textPreview = String(notice.message || '')
      .replace(/\s+/g, ' ')
      .trim();
    const body =
      textPreview.length > NOTIFICATION_PREVIEW_LIMIT
        ? `${textPreview.slice(0, NOTIFICATION_PREVIEW_LIMIT - 1)}...`
        : textPreview || 'Voce recebeu um aviso do suporte.';
    const frontendUrl = getFrontendUrl();
    const url = `${frontendUrl}/chat`;
    const iconUrl = getNotificationIconUrl();

    return {
      title: notice.title || 'Aviso do suporte',
      body,
      url,
      conversation_id: conversation.id,
      icon: iconUrl,
      badge: iconUrl
    };
  }

  async notifyWebPush(data, conversation) {
    if (!this.enabled) {
      this.configure();
    }

    if (!this.enabled) {
      return;
    }

    const subscriptions = await PushSubscription.findAll({
      where: {
        cliente_id_externo: String(conversation.cliente_id_externo),
        [Op.or]: [{ conversation_id: conversation.id }, { conversation_id: null }]
      }
    });

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify(data);

    await Promise.allSettled(
      subscriptions.map(async record => {
        try {
          await webPush.sendNotification(
            {
              endpoint: record.endpoint,
              keys: {
                p256dh: record.p256dh,
                auth: record.auth
              }
            },
            payload
          );
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) {
            await record.destroy();
          }
        }
      })
    );
  }

  async notifyPushAlert(data, conversation) {
    const apiKey = (process.env.PUSHALERT_REST_API_KEY || '').trim();

    if (!apiKey) {
      return;
    }

    const subscriptions = await PushAlertSubscription.findAll({
      where: {
        cliente_id_externo: String(conversation.cliente_id_externo),
        [Op.or]: [{ conversation_id: conversation.id }, { conversation_id: null }]
      }
    });

    if (subscriptions.length === 0) {
      console.log('PushAlert sem assinaturas para conversa', {
        conversation_id: conversation.id,
        cliente_id_externo: conversation.cliente_id_externo
      });
      return;
    }

    const sendUrl = (process.env.PUSHALERT_SEND_URL || PUSHALERT_DEFAULT_SEND_URL).trim();
    const subscriptionsToNotify = subscriptions.slice(0, Number(process.env.PUSHALERT_MAX_RECIPIENTS || 3));

    await Promise.allSettled(
      subscriptionsToNotify.map(async record => {
        console.log('PushAlert enviando', {
          conversation_id: conversation.id,
          subscriber_id: record.subscriber_id
        });

        const form = new URLSearchParams({
          title: data.title,
          message: data.body,
          url: data.url,
          icon: data.icon,
          subscriber: record.subscriber_id
        });

        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            Authorization: `api_key=${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString()
        });

        const responseText = await response.text();

        if (!response.ok) {
          if (response.status === 429) {
            console.warn('PushAlert rate limit atingido', {
              sendUrl,
              subscriber_id: record.subscriber_id
            });
            return;
          }

          console.error('PushAlert envio falhou', {
            sendUrl,
            status: response.status,
            body: responseText,
            subscriber_id: record.subscriber_id
          });
          return;
        }

        try {
          const output = JSON.parse(responseText);

          if (output && output.success === false) {
            console.error('PushAlert envio recusado', {
              sendUrl,
              body: output,
              subscriber_id: record.subscriber_id
            });
            return;
          }
        } catch {
          // PushAlert may return a plain notification id on success.
        }

        console.log('PushAlert envio solicitado', {
          sendUrl,
          status: response.status,
          body: responseText,
          subscriber_id: record.subscriber_id
        });
      })
    );
  }

  async notifyClientMessage(message, conversation) {
    if (message.sender_type !== 'ATENDENTE') {
      return;
    }

    const data = this.buildNotificationData(message, conversation);
    const clientIsPresent = hasClientInConversation(conversation.id);
    const tasks = [this.notifyClientExpoPush(data, conversation)];

    if (!clientIsPresent) {
      tasks.push(
        this.notifyWebPush(data, conversation),
        this.notifyPushAlert(data, conversation)
      );
    }

    await Promise.allSettled(tasks);
  }

  async notifyClientExpoPush(data, conversation) {
    const tokens = await ExpoPushToken.findAll({
      where: {
        cliente_id_externo: String(conversation.cliente_id_externo),
        [Op.or]: [{ conversation_id: conversation.id }, { conversation_id: null }]
      }
    });

    if (tokens.length === 0) {
      console.log('Expo push cliente sem tokens', {
        conversation_id: conversation.id,
        cliente_id_externo: conversation.cliente_id_externo
      });
      return;
    }

    console.log('Expo push cliente enviando', {
      conversation_id: conversation.id,
      cliente_id_externo: conversation.cliente_id_externo,
      tokens: tokens.length
    });

    const messages = tokens.map(record => ({
      to: record.token,
      title: data.title,
      body: data.body,
      sound: 'default',
      channelId: 'chat-messages',
      priority: 'high',
      data: {
        conversationId: data.conversation_id,
        conversation_id: data.conversation_id,
        url: data.url
      }
    }));

    await Promise.allSettled(
      chunkItems(messages, 100).map(async batch => {
        const response = await axios.post(EXPO_PUSH_SEND_URL, batch, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        const tickets = Array.isArray(response.data?.data) ? response.data.data : [];

        await Promise.allSettled(
          tickets.map(async (ticket, index) => {
            if (ticket?.status !== 'error') {
              return;
            }

            const failedToken = batch[index]?.to;

            console.error('Expo push cliente falhou', {
              conversation_id: conversation.id,
              token: String(failedToken || '').slice(0, 32),
              message: ticket.message,
              details: ticket.details
            });

            if (ticket.details?.error === 'DeviceNotRegistered' && failedToken) {
              await ExpoPushToken.destroy({ where: { token: failedToken } });
            }
          })
        );
      })
    );
  }
  async notifyBroadcastNotice(notice, conversation) {
    const data = this.buildBroadcastNotificationData(notice, conversation);

    await Promise.allSettled([
      this.notifyWebPush(data, conversation),
      this.notifyPushAlert(data, conversation),
      this.notifyClientExpoPush(data, conversation)
    ]);
  }

  async notifyAdminMessage(message, conversation) {
    if (message.sender_type !== 'CLIENTE') {
      return;
    }

    const where = conversation.atendente_id
      ? {
          [Op.or]: [{ id: conversation.atendente_id }, { role: 'ADMIN' }]
        }
      : {
          role: {
            [Op.in]: ['ADMIN', 'ATENDENTE']
          }
    };
    const users = await User.findAll({ where });
    const targetUserIds = users.map(user => user.id);

    if (targetUserIds.length === 0) {
      console.log('Push admin sem usuarios para notificar', {
        conversation_id: conversation.id,
        atendente_id: conversation.atendente_id
      });
      return;
    }

    const data = await this.buildAdminNotificationData(message, conversation);
    const payload = JSON.stringify(data);
    const tasks = [
      this.notifyAdminPushAlert(data, targetUserIds, conversation),
      this.notifyAdminExpoPush(data, targetUserIds, conversation)
    ];

    if (!this.enabled) {
      this.configure();
    }

    if (this.enabled) {
      const subscriptions = await PushSubscription.findAll({
        where: {
          user_id: {
            [Op.in]: targetUserIds
          }
        }
      });

      if (subscriptions.length === 0) {
        console.log('Push admin sem assinaturas WebPush', {
          conversation_id: conversation.id,
          target_user_ids: targetUserIds
        });
      } else {
        tasks.push(
          Promise.allSettled(
            subscriptions.map(async record => {
              try {
                console.log('Push admin enviando WebPush', {
                  conversation_id: conversation.id,
                  user_id: record.user_id,
                  endpoint: String(record.endpoint || '').slice(0, 48)
                });

                await webPush.sendNotification(
                  {
                    endpoint: record.endpoint,
                    keys: {
                      p256dh: record.p256dh,
                      auth: record.auth
                    }
                  },
                  payload
                );

                console.log('Push admin WebPush enviado', {
                  conversation_id: conversation.id,
                  user_id: record.user_id
                });
              } catch (error) {
                console.error('Push admin WebPush falhou', {
                  conversation_id: conversation.id,
                  user_id: record.user_id,
                  statusCode: error.statusCode,
                  body: error.body,
                  message: error.message
                });

                if (
                  [403, 404, 410].includes(error.statusCode) &&
                  (
                    [404, 410].includes(error.statusCode) ||
                    String(error.body || '').includes('VAPID credentials')
                  )
                ) {
                  await record.destroy();
                }
              }
            })
          )
        );
      }
    } else {
      console.log('Push admin WebPush desativado, tentando PushAlert', {
        conversation_id: conversation.id,
        target_user_ids: targetUserIds
      });
    }

    await Promise.allSettled(tasks);
  }

  async notifyAdminExpoPush(data, targetUserIds, conversation) {
    if (targetUserIds.length === 0) {
      return;
    }

    const tokens = await ExpoPushToken.findAll({
      where: {
        user_id: {
          [Op.in]: targetUserIds
        }
      }
    });

    if (tokens.length === 0) {
      console.log('Expo push admin sem tokens', {
        conversation_id: conversation.id,
        target_user_ids: targetUserIds
      });
      return;
    }

    const messages = tokens.map(record => ({
      to: record.token,
      title: data.title,
      body: data.body,
      sound: 'default',
      channelId: 'chat-messages',
      priority: 'high',
      data: {
        conversationId: data.conversation_id,
        conversation_id: data.conversation_id,
        url: data.url
      }
    }));

    await Promise.allSettled(
      chunkItems(messages, 100).map(async batch => {
        const response = await axios.post(EXPO_PUSH_SEND_URL, batch, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        const tickets = Array.isArray(response.data?.data) ? response.data.data : [];

        await Promise.allSettled(
          tickets.map(async (ticket, index) => {
            if (ticket?.status !== 'error') {
              return;
            }

            const failedToken = batch[index]?.to;

            console.error('Expo push admin falhou', {
              conversation_id: conversation.id,
              token: String(failedToken || '').slice(0, 32),
              message: ticket.message,
              details: ticket.details
            });

            if (ticket.details?.error === 'DeviceNotRegistered' && failedToken) {
              await ExpoPushToken.destroy({ where: { token: failedToken } });
            }
          })
        );
      })
    );
  }

  async notifyAdminPushAlert(data, targetUserIds, conversation) {
    const apiKey = (process.env.PUSHALERT_REST_API_KEY || '').trim();

    if (!apiKey || targetUserIds.length === 0) {
      return;
    }

    const subscriptions = await PushAlertSubscription.findAll({
      where: {
        user_id: {
          [Op.in]: targetUserIds
        }
      }
    });

    if (subscriptions.length === 0) {
      console.log('PushAlert admin sem assinaturas', {
        conversation_id: conversation.id,
        target_user_ids: targetUserIds
      });
      return;
    }

    const sendUrl = (process.env.PUSHALERT_SEND_URL || PUSHALERT_DEFAULT_SEND_URL).trim();

    await Promise.allSettled(
      subscriptions.map(async record => {
        const form = new URLSearchParams({
          title: data.title,
          message: data.body,
          url: data.url,
          icon: data.icon,
          subscriber: record.subscriber_id
        });

        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            Authorization: `api_key=${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString()
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.error('PushAlert admin falhou', {
            sendUrl,
            status: response.status,
            body: responseText,
            subscriber_id: record.subscriber_id
          });
          return;
        }

        console.log('PushAlert admin solicitado', {
          sendUrl,
          status: response.status,
          body: responseText,
          subscriber_id: record.subscriber_id
        });
      })
    );
  }

  async testAdminPush(user) {
    if (!user) {
      throw new ApiError('JWT obrigatorio para testar notificacoes do painel', 401);
    }

    const data = {
      title: 'Teste SuporteSync',
      body: 'Notificacao do painel administrativo ativada neste dispositivo.',
      url: `${getFrontendUrl()}/dashboard?tab=chats`,
      conversation_id: 'admin-test',
      icon: getNotificationIconUrl(),
      badge: getNotificationIconUrl()
    };
    const webPushSubscriptions = await PushSubscription.findAll({
      where: {
        user_id: user.id
      }
    });
    const pushAlertSubscriptions = await PushAlertSubscription.findAll({
      where: {
        user_id: user.id
      }
    });
    const expoPushTokens = await ExpoPushToken.findAll({
      where: {
        user_id: user.id
      }
    });
    const payload = JSON.stringify(data);

    if (!this.enabled) {
      this.configure();
    }

    if (this.enabled) {
      await Promise.allSettled(
        webPushSubscriptions.map(async record => {
          try {
            await webPush.sendNotification(
              {
                endpoint: record.endpoint,
                keys: {
                  p256dh: record.p256dh,
                  auth: record.auth
                }
              },
              payload
            );
          } catch (error) {
            if (
              [403, 404, 410].includes(error.statusCode) &&
              (
                [404, 410].includes(error.statusCode) ||
                String(error.body || '').includes('VAPID credentials')
              )
            ) {
              await record.destroy();
            }
          }
        })
      );
    }

    await Promise.allSettled([
      this.notifyAdminPushAlert(data, [user.id], { id: 'admin-test' }),
      this.notifyAdminExpoPush(data, [user.id], { id: 'admin-test' })
    ]);

    return {
      success: true,
      webpush_subscriptions: webPushSubscriptions.length,
      pushalert_subscriptions: pushAlertSubscriptions.length,
      expo_push_tokens: expoPushTokens.length
    };
  }
}

module.exports = new PushService();
