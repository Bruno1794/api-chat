const webPush = require('web-push');
const { Op } = require('sequelize');

const ApiError = require('../utils/ApiError');
const ClienteService = require('./ClienteService');
const { hasClientInConversation } = require('../utils/conversationPresence');
const { Conversation, PushSubscription } = require('../models');

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
      publicKey: process.env.VAPID_PUBLIC_KEY || null
    };
  }

  async subscribe(data, userAgent = null) {
    const cliente = await ClienteService.findByAccessCode(data.codigo || data.code);
    const subscription = data.subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new ApiError('Assinatura push invalida', 422);
    }

    let conversationId = data.conversation_id || null;

    if (conversationId) {
      const conversation = await Conversation.findByPk(conversationId);

      if (!conversation) {
        throw new ApiError('Conversa nao encontrada', 404);
      }

      if (String(conversation.cliente_id_externo) !== String(cliente.id)) {
        throw new ApiError('Codigo de acesso nao pertence a esta conversa', 403);
      }
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

  buildNotificationPayload(message, conversation) {
    const body = message.message || (
      message.message_type === 'IMAGE'
        ? 'Imagem recebida'
        : message.message_type === 'AUDIO'
          ? 'Audio recebido'
          : 'Arquivo recebido'
    );
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const url = frontendUrl ? `${frontendUrl}/chat` : '/chat';

    return JSON.stringify({
      title: 'Nova mensagem no suporte',
      body,
      url,
      conversation_id: conversation.id,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png'
    });
  }

  async notifyClientMessage(message, conversation) {
    if (message.sender_type !== 'ATENDENTE' || hasClientInConversation(conversation.id)) {
      return;
    }

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

    const payload = this.buildNotificationPayload(message, conversation);

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
}

module.exports = new PushService();
