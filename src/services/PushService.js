const webPush = require('web-push');
const { Op } = require('sequelize');

const ApiError = require('../utils/ApiError');
const ClienteService = require('./ClienteService');
const { hasClientInConversation } = require('../utils/conversationPresence');
const { Conversation, PushAlertSubscription, PushSubscription } = require('../models');

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
    const body = message.message || (
      message.message_type === 'IMAGE'
        ? 'Imagem recebida'
        : message.message_type === 'AUDIO'
          ? 'Audio recebido'
          : 'Arquivo recebido'
    );
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const url = frontendUrl ? `${frontendUrl}/chat` : '/chat';
    const iconUrl = frontendUrl ? `${frontendUrl}/icons/icon-192.png` : undefined;

    return {
      title: 'Nova mensagem no suporte',
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
    const apiKey = process.env.PUSHALERT_REST_API_KEY;

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
      return;
    }

    const sendUrl = process.env.PUSHALERT_SEND_URL || 'https://api.pushalert.co/rest/v1/send';

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
          console.error('PushAlert envio falhou', {
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
              body: output,
              subscriber_id: record.subscriber_id
            });
          }
        } catch {
          // PushAlert may return a plain notification id on success.
        }
      })
    );
  }

  async notifyClientMessage(message, conversation) {
    if (message.sender_type !== 'ATENDENTE' || hasClientInConversation(conversation.id)) {
      return;
    }

    const data = this.buildNotificationData(message, conversation);

    await Promise.allSettled([
      this.notifyWebPush(data, conversation),
      this.notifyPushAlert(data, conversation)
    ]);
  }
}

module.exports = new PushService();
