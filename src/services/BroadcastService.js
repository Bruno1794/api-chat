const PushService = require('./PushService');
const ConversationService = require('./ConversationService');
const MessageService = require('./MessageService');
const { Conversation, Message } = require('../models');
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

    const notificationBase = {
      title,
      message,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        nome: user.nome
      }
    };

    const onlineConversationIds = [];
    const createdMessages = [];

    const results = await Promise.allSettled(
      conversations.map(async conversation => {
        if (hasClientInConversation(conversation.id)) {
          onlineConversationIds.push(conversation.id);
        }

        const savedMessage = await Message.create({
          conversation_id: conversation.id,
          sender_type: 'ATENDENTE',
          sender_id: user.id,
          message,
          message_type: 'TEXT',
          read: false
        });

        await ConversationService.updateLastInteraction(conversation, savedMessage);

        const payload = await MessageService.findMessagePayload(savedMessage.id);

        socket.emitToConversation(conversation.id, 'message_received', payload);
        socket.emitToConversation(conversation.id, 'message_sent', payload);
        socket.emitToAll('conversation_updated', {
          conversation_id: conversation.id
        });

        await PushService.notifyBroadcastNotice(notificationBase, conversation);

        createdMessages.push(payload);

        return payload;
      })
    );

    return {
      success: true,
      total_conversations: conversations.length,
      messages_created: createdMessages.length,
      failed_conversations: results.filter(result => result.status === 'rejected').length,
      online_conversations: onlineConversationIds.length,
      push_conversations: createdMessages.length
    };
  }
}

module.exports = new BroadcastService();
