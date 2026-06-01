const ApiError = require('../utils/ApiError');
const socket = require('../utils/socket');
const ConversationService = require('./ConversationService');
const { Conversation, Message, Attachment, MessageReaction } = require('../models');
const ClienteService = require('./ClienteService');
const PushService = require('./PushService');

const messageIncludes = [
  {
    model: Attachment,
    as: 'attachments'
  },
  {
    model: MessageReaction,
    as: 'reactions'
  }
];

class MessageService {
  async list(conversationId, user, query = {}) {
    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    if (user) {
      ConversationService.ensureCanAccess(conversation, user);
    } else {
      const cliente = await ClienteService.findByAccessCode(query.codigo || query.code);

      if (String(cliente.id) !== String(conversation.cliente_id_externo)) {
        throw new ApiError('Codigo de acesso nao pertence a esta conversa', 403);
      }
    }

    return Message.findAll({
      where: {
        conversation_id: conversationId
      },
      include: messageIncludes,
      order: [['created_at', 'ASC']]
    });
  }

  async create(data, user = null) {
    if (!data.conversation_id || !data.sender_type) {
      throw new ApiError('conversation_id e sender_type sao obrigatorios', 422);
    }

    if (!data.message && !data.attachments?.length) {
      throw new ApiError('Mensagem ou anexo e obrigatorio', 422);
    }

    const conversation = await Conversation.findByPk(data.conversation_id);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    if (!user && data.sender_type !== 'CLIENTE') {
      throw new ApiError('JWT obrigatorio para mensagens de atendente ou sistema', 401);
    }

    if (user && ['ATENDENTE', 'SISTEMA'].includes(data.sender_type)) {
      ConversationService.ensureCanAccess(conversation, user);
    }

    if (data.sender_type === 'SISTEMA' && user?.role !== 'ADMIN') {
      throw new ApiError('Apenas ADMIN pode enviar mensagens de sistema', 403);
    }

    const message = await Message.create({
      conversation_id: data.conversation_id,
      sender_type: data.sender_type,
      sender_id: data.sender_id || user?.id || null,
      message: data.message || null,
      message_type: data.message_type || 'TEXT',
      read: Boolean(data.read)
    });

    if (data.attachments?.length) {
      await Attachment.bulkCreate(
        data.attachments.map(attachment => ({
          ...attachment,
          message_id: message.id
        }))
      );
    }

    await ConversationService.updateLastInteraction(conversation, message);

    const payload = await this.findMessagePayload(message.id);

    socket.emitToConversation(data.conversation_id, 'message_received', payload);
    socket.emitToConversation(data.conversation_id, 'message_sent', payload);
    socket.emitToAll('conversation_updated', {
      conversation_id: data.conversation_id
    });

    void PushService.notifyClientMessage(payload, conversation).catch(() => undefined);

    return payload;
  }

  async update(id, data, user = null) {
    const message = await this.findMessageWithConversation(id);

    this.ensureCanManageMessage(message, data, user);

    if (message.deleted_at) {
      throw new ApiError('Mensagem apagada nao pode ser editada', 422);
    }

    const text = String(data.message || '').trim();

    if (!text) {
      throw new ApiError('message e obrigatorio', 422);
    }

    await message.update({
      message: text,
      edited_at: new Date()
    });

    await ConversationService.refreshLastInteractionForMessage(message);

    return this.emitMessageUpdate(message.id);
  }

  async delete(id, data, user = null) {
    const message = await this.findMessageWithConversation(id);

    this.ensureCanManageMessage(message, data, user);

    await message.update({
      message: null,
      deleted_at: new Date()
    });

    await Attachment.destroy({
      where: {
        message_id: message.id
      }
    });

    await MessageReaction.destroy({
      where: {
        message_id: message.id
      }
    });

    await ConversationService.refreshLastInteractionForMessage(message);

    return this.emitMessageUpdate(message.id);
  }

  async markAsRead(id, user) {
    const message = await Message.findByPk(id, {
      include: [
        {
          model: Conversation,
          as: 'conversation'
        }
      ]
    });

    if (!message) {
      throw new ApiError('Mensagem nao encontrada', 404);
    }

    if (user) {
      ConversationService.ensureCanAccess(message.conversation, user);
    } else if (message.sender_type !== 'ATENDENTE') {
      throw new ApiError('JWT obrigatorio para marcar esta mensagem como lida', 401);
    }

    await message.update({
      read: true
    });

    socket.emitToConversation(message.conversation_id, 'message_read', {
      message_id: message.id,
      conversation_id: message.conversation_id,
      read: true
    });

    return message;
  }

  async react(id, data, user = null) {
    const message = await this.findMessageWithConversation(id);
    const actor = this.resolveReactionActor(data, user);

    this.ensureCanReact(message, actor, user);

    const emoji = String(data.emoji || '').trim();

    if (!emoji) {
      throw new ApiError('emoji e obrigatorio', 422);
    }

    const [reaction] = await MessageReaction.findOrCreate({
      where: {
        message_id: message.id,
        actor_type: actor.actor_type,
        actor_id: actor.actor_id
      },
      defaults: {
        emoji
      }
    });

    if (reaction.emoji !== emoji) {
      await reaction.update({ emoji });
    }

    return this.emitReactionUpdate(message.id);
  }

  async deleteReaction(id, data, user = null) {
    const message = await this.findMessageWithConversation(id);
    const actor = this.resolveReactionActor(data, user);

    this.ensureCanReact(message, actor, user);

    await MessageReaction.destroy({
      where: {
        message_id: message.id,
        actor_type: actor.actor_type,
        actor_id: actor.actor_id
      }
    });

    return this.emitReactionUpdate(message.id);
  }

  async findMessageWithConversation(id) {
    const message = await Message.findByPk(id, {
      include: [
        {
          model: Conversation,
          as: 'conversation'
        }
      ]
    });

    if (!message) {
      throw new ApiError('Mensagem nao encontrada', 404);
    }

    return message;
  }

  async findMessagePayload(id) {
    return Message.findByPk(id, {
      include: messageIncludes
    });
  }

  resolveReactionActor(data, user) {
    if (user) {
      return {
        actor_type: 'ATENDENTE',
        actor_id: String(user.id)
      };
    }

    if (data.actor_type !== 'CLIENTE') {
      throw new ApiError('JWT obrigatorio para reagir como atendente', 401);
    }

    return {
      actor_type: 'CLIENTE',
      actor_id: String(data.actor_id || '')
    };
  }

  ensureCanManageMessage(message, data, user) {
    if (user) {
      ConversationService.ensureCanAccess(message.conversation, user);

      if (message.sender_type !== 'ATENDENTE' || String(message.sender_id) !== String(user.id)) {
        throw new ApiError('Voce so pode alterar suas proprias mensagens', 403);
      }

      return;
    }

    if (data.actor_type !== 'CLIENTE' || !data.actor_id) {
      throw new ApiError('actor_type e actor_id sao obrigatorios para cliente', 422);
    }

    if (
      message.sender_type !== 'CLIENTE' ||
      String(message.sender_id) !== String(data.actor_id) ||
      String(message.conversation.cliente_id_externo) !== String(data.actor_id)
    ) {
      throw new ApiError('Cliente so pode alterar suas proprias mensagens', 403);
    }
  }

  async emitMessageUpdate(messageId) {
    const payload = await this.findMessagePayload(messageId);

    socket.emitToConversation(payload.conversation_id, 'message_updated', payload);
    socket.emitToAll('conversation_updated', {
      conversation_id: payload.conversation_id
    });

    return payload;
  }

  ensureCanReact(message, actor, user) {
    if (user) {
      ConversationService.ensureCanAccess(message.conversation, user);
      return;
    }

    if (!actor.actor_id) {
      throw new ApiError('actor_id e obrigatorio para reacao do cliente', 422);
    }

    if (String(message.conversation.cliente_id_externo) !== String(actor.actor_id)) {
      throw new ApiError('Cliente nao pode reagir nesta conversa', 403);
    }
  }

  async emitReactionUpdate(messageId) {
    const payload = await this.findMessagePayload(messageId);

    socket.emitToConversation(payload.conversation_id, 'message_reaction_updated', {
      message_id: payload.id,
      conversation_id: payload.conversation_id,
      reactions: payload.reactions || []
    });

    return payload;
  }
}

module.exports = new MessageService();
