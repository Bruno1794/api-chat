const axios = require('axios');

const ApiError = require('../utils/ApiError');
const socket = require('../utils/socket');
const ConversationService = require('./ConversationService');
const PushService = require('./PushService');
const { Conversation, Message, PixCharge } = require('../models');

const FASTDEPIX_BASE_URL = 'https://fastdepix.space/api/v1';
const FINAL_STATUSES = ['paid', 'expired', 'cancelled', 'refunded'];

function getApiBaseUrl() {
  return (process.env.FASTDEPIX_BASE_URL || FASTDEPIX_BASE_URL).replace(/\/$/, '');
}

function getAppUrl() {
  return (process.env.APP_URL || '').replace(/\/$/, '');
}

function getNotificationUrl() {
  if (process.env.FASTDEPIX_NOTIFICATION_URL) {
    return process.env.FASTDEPIX_NOTIFICATION_URL;
  }

  const appUrl = getAppUrl();

  return appUrl ? `${appUrl}/pix/webhook` : null;
}

function parsePixDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPixMessage(charge) {
  const amount = Number(charge.amount || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  const payload = {
    type: 'card',
    variant: 'pix',
    title: `PIX ${amount}`,
    body: 'Use o QR Code ou copie o codigo PIX para renovar o servico.',
    value: charge.qr_code_text,
    imageUrl: charge.qr_code,
    expiresAt: charge.qr_code_expires_at,
    pixChargeId: charge.id,
    pixStatus: charge.status,
    actions: [
      {
        id: 'copy-pix',
        label: 'Copiar codigo PIX',
        type: 'copy',
        value: charge.qr_code_text
      }
    ]
  };

  return `[[SUPORTESYNC_CARD:${JSON.stringify(payload)}]]`;
}

class PixService {
  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: Number(process.env.FASTDEPIX_TIMEOUT_MS || 15000)
    });
  }

  ensureConfigured() {
    if (!process.env.FASTDEPIX_API_KEY) {
      throw new ApiError('FASTDEPIX_API_KEY nao configurada', 500);
    }
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${process.env.FASTDEPIX_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  async createCharge(data, user) {
    this.ensureConfigured();

    const amount = Number(data.amount);

    if (!Number.isFinite(amount) || amount < 10) {
      throw new ApiError('Valor minimo para PIX e R$ 10,00', 422);
    }

    if (!data.conversation_id) {
      throw new ApiError('conversation_id e obrigatorio', 422);
    }

    const conversation = await Conversation.findByPk(data.conversation_id);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    ConversationService.ensureCanAccess(conversation, user);

    const notificationUrl = getNotificationUrl();
    const payload = {
      amount,
      user: data.user || undefined,
      payer_phone: data.payer_phone || data.phone || undefined,
      notification_url: notificationUrl || undefined
    };

    const response = await this.client.post('/transactions', payload, {
      headers: this.getHeaders()
    });
    const transaction = response.data?.data;

    if (!transaction?.id || !transaction.qr_code_text) {
      throw new ApiError('FastDePix nao retornou dados do QR Code PIX', 502);
    }

    const charge = await PixCharge.create({
      conversation_id: conversation.id,
      created_by: user.id,
      fastdepix_transaction_id: String(transaction.id),
      depix_transaction_id: transaction.depix_transaction_id || null,
      amount: transaction.amount || amount,
      status: transaction.status || 'pending',
      qr_code: transaction.qr_code || null,
      qr_code_text: transaction.qr_code_text,
      qr_code_expires_at: parsePixDate(transaction.qr_code_expires_at),
      notification_url: transaction.notification_url || notificationUrl || null
    });

    const message = await Message.create({
      conversation_id: conversation.id,
      sender_type: 'SISTEMA',
      sender_id: String(user.id),
      message: buildPixMessage(charge),
      message_type: 'TEXT',
      read: false
    });

    await charge.update({ message_id: message.id });
    await ConversationService.updateLastInteraction(conversation, message);

    const messagePayload = await this.findMessagePayload(message.id);

    socket.emitToConversation(conversation.id, 'message_received', messagePayload);
    socket.emitToConversation(conversation.id, 'message_sent', messagePayload);
    socket.emitToAll('conversation_updated', {
      conversation_id: conversation.id
    });

    void PushService.notifyClientMessage(messagePayload, conversation).catch(() => undefined);

    return {
      charge,
      message: messagePayload
    };
  }

  async findMessagePayload(messageId) {
    return Message.findByPk(messageId, {
      include: [
        {
          association: 'attachments'
        },
        {
          association: 'reactions'
        }
      ]
    });
  }

  async handleWebhook(payload) {
    const event = payload.event || payload.type || payload.status || '';
    const transaction = payload.data || payload.transaction || payload;
    const transactionId =
      transaction.id ||
      transaction.transaction_id ||
      transaction.fastdepix_transaction_id ||
      payload.transaction_id;

    if (!transactionId) {
      throw new ApiError('transaction_id ausente no webhook PIX', 422);
    }

    const charge = await PixCharge.findOne({
      where: {
        fastdepix_transaction_id: String(transactionId)
      }
    });

    if (!charge) {
      return {
        success: true,
        ignored: true
      };
    }

    const status = transaction.status || this.statusFromEvent(event);

    if (!status || status === charge.status) {
      return {
        success: true,
        charge
      };
    }

    return this.applyStatus(charge, status);
  }

  statusFromEvent(event) {
    if (String(event).includes('paid')) {
      return 'paid';
    }

    if (String(event).includes('expired')) {
      return 'expired';
    }

    if (String(event).includes('approved')) {
      return 'approved';
    }

    return null;
  }

  async applyStatus(charge, status) {
    const updates = {
      status
    };

    if (status === 'paid') {
      updates.paid_at = new Date();
    }

    if (status === 'expired') {
      updates.expired_at = new Date();
    }

    await charge.update(updates);

    if (!FINAL_STATUSES.includes(status)) {
      return {
        success: true,
        charge
      };
    }

    if (charge.message_id) {
      const message = await Message.findByPk(charge.message_id);

      if (message) {
        const removedPayload = {
          message_id: message.id,
          conversation_id: message.conversation_id
        };

        await message.destroy();
        socket.emitToConversation(message.conversation_id, 'message_removed', removedPayload);
      }
    }

    if (status === 'paid') {
      const successMessage = await Message.create({
        conversation_id: charge.conversation_id,
        sender_type: 'SISTEMA',
        sender_id: null,
        message: 'Pagamento PIX confirmado. Servico renovado com sucesso.',
        message_type: 'TEXT',
        read: false
      });
      const conversation = await Conversation.findByPk(charge.conversation_id);

      if (conversation) {
        await ConversationService.updateLastInteraction(conversation, successMessage);
      }

      const messagePayload = await this.findMessagePayload(successMessage.id);
      socket.emitToConversation(charge.conversation_id, 'message_received', messagePayload);
      socket.emitToConversation(charge.conversation_id, 'message_sent', messagePayload);
    }

    socket.emitToAll('conversation_updated', {
      conversation_id: charge.conversation_id
    });

    return {
      success: true,
      charge
    };
  }
}

module.exports = new PixService();
