const PushService = require('./PushService');
const { Conversation } = require('../models');
const ApiError = require('../utils/ApiError');
const socket = require('../utils/socket');
const { hasClientInConversation } = require('../utils/conversationPresence');

const NOTICE_LIMIT = 600;

class BroadcastService {
  async sendNotice(data, user) {
    const message = String(data.message || '').trim();
    const title = String(data.title || 'Aviso do suporte').trim();

    if (!message) {
      throw new ApiError('Mensagem do aviso e obrigatoria', 422);
    }

    if (message.length > NOTICE_LIMIT) {
      throw new ApiError(`Mensagem do aviso deve ter ate ${NOTICE_LIMIT} caracteres`, 422);
    }

    const conversations = await Conversation.findAll();

    const payloadBase = {
      id: `notice-${Date.now()}`,
      title,
      message,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        nome: user.nome
      }
    };

    const onlineConversationIds = [];

    conversations.forEach(conversation => {
      const payload = {
        ...payloadBase,
        conversation_id: conversation.id
      };

      socket.emitToConversation(conversation.id, 'broadcast_notice', payload);

      if (hasClientInConversation(conversation.id)) {
        onlineConversationIds.push(conversation.id);
      }
    });

    await Promise.allSettled(
      conversations.map(conversation =>
        PushService.notifyBroadcastNotice(payloadBase, conversation)
      )
    );

    return {
      success: true,
      total_conversations: conversations.length,
      online_conversations: onlineConversationIds.length,
      push_conversations: conversations.length
    };
  }
}

module.exports = new BroadcastService();
