const ApiError = require('../utils/ApiError');
const ConversationService = require('./ConversationService');
const { Conversation, Note, User } = require('../models');

class NoteService {
  async list(conversationId, user) {
    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    ConversationService.ensureCanAccess(conversation, user);

    return Note.findAll({
      where: {
        conversation_id: conversationId
      },
      include: [
        {
          model: User,
          as: 'user'
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async create(data, user) {
    if (!data.conversation_id || !data.note) {
      throw new ApiError('conversation_id e note sao obrigatorios', 422);
    }

    const conversation = await Conversation.findByPk(data.conversation_id);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    ConversationService.ensureCanAccess(conversation, user);

    return Note.create({
      conversation_id: data.conversation_id,
      user_id: user.id,
      note: data.note
    });
  }

  async delete(id, user) {
    const note = await Note.findByPk(id, {
      include: [
        {
          model: Conversation,
          as: 'conversation'
        }
      ]
    });

    if (!note) {
      throw new ApiError('Nota nao encontrada', 404);
    }

    if (user.role !== 'ADMIN' && note.user_id !== user.id) {
      throw new ApiError('Voce nao tem permissao para excluir esta nota', 403);
    }

    await note.destroy();

    return {
      success: true
    };
  }
}

module.exports = new NoteService();
