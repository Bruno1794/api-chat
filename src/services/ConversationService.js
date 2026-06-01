const { Op } = require('sequelize');

const ApiError = require('../utils/ApiError');
const socket = require('../utils/socket');
const {
  generateClientAccessCode,
  validateClientAccessCode
} = require('../utils/clientAccessCode');
const ClienteService = require('./ClienteService');
const { Conversation, Message, Note, User } = require('../models');

class ConversationService {
  async list({ user, query = {} }) {
    const where = {};
    const and = [];

    if (query.status) {
      where.status = query.status;
    }

    if (query.cliente_id_externo) {
      where.cliente_id_externo = query.cliente_id_externo;
    }

    if (query.search) {
      and.push({
        [Op.or]: [
          { cliente_id_externo: { [Op.like]: `%${query.search}%` } },
          { ultima_mensagem: { [Op.like]: `%${query.search}%` } }
        ]
      });
    }

    if (user.role === 'ATENDENTE') {
      and.push({
        [Op.or]: [{ atendente_id: user.id }, { atendente_id: null }]
      });
    }

    if (and.length) {
      where[Op.and] = and;
    }

    const conversations = await Conversation.findAll({
      where,
      include: [
        {
          model: User,
          as: 'atendente'
        }
      ],
      order: [['ultima_interacao', 'DESC']]
    });

    return Promise.all(conversations.map(conversation => this.enrich(conversation)));
  }

  async findById(id, user) {
    const conversation = await Conversation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'atendente'
        }
      ]
    });

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    this.ensureCanAccess(conversation, user);

    return this.enrich(conversation, true);
  }

  async create(data, user = null) {
    let cliente = null;

    if (!user && !data.codigo) {
      throw new ApiError('codigo e obrigatorio para iniciar conversa publica', 422);
    }

    if (!user && data.cliente_referencia) {
      cliente = await ClienteService.findByReferencia(data.cliente_referencia);

      if (!validateClientAccessCode(cliente, data.codigo)) {
        throw new ApiError('Codigo de acesso do cliente invalido', 403);
      }
    } else if (!user) {
      cliente = await ClienteService.findByAccessCode(data.codigo);
    }

    const clienteIdExterno = data.cliente_id_externo || cliente?.id;

    if (!clienteIdExterno) {
      throw new ApiError('cliente_id_externo ou cliente_referencia e obrigatorio', 422);
    }

    if (!cliente) {
      cliente = await ClienteService.findById(clienteIdExterno);
    }

    const existing = await Conversation.findOne({
      where: {
        cliente_id_externo: String(clienteIdExterno),
        status: {
          [Op.in]: ['ABERTA', 'AGUARDANDO_CLIENTE']
        }
      }
    });

    if (existing) {
      return this.enrich(existing, true);
    }

    const now = new Date();

    const conversation = await Conversation.create({
      cliente_id_externo: String(clienteIdExterno),
      atendente_id: data.atendente_id || user?.id || null,
      status: 'ABERTA',
      ultima_interacao: now
    });

    return this.enrich(conversation, true);
  }

  async generateClientChatAccess(clienteId) {
    const cliente = await ClienteService.findById(clienteId);
    const codigo = generateClientAccessCode(cliente);
    const referencia = cliente.referencia || cliente.usuario_referencia;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return {
      cliente,
      referencia,
      codigo,
      url: `${frontendUrl}/chat?code=${encodeURIComponent(codigo)}`
    };
  }

  async update(id, data, user) {
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    this.ensureCanAccess(conversation, user);

    await conversation.update(data);

    socket.emitToAll('conversation_updated', {
      conversation_id: conversation.id
    });

    return this.enrich(conversation, true);
  }

  async delete(id, user) {
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      throw new ApiError('Conversa nao encontrada', 404);
    }

    if (user.role !== 'ADMIN') {
      throw new ApiError('Apenas ADMIN pode excluir conversas', 403);
    }

    await conversation.destroy();

    return {
      success: true
    };
  }

  async close(id, user) {
    return this.updateStatus(id, 'FINALIZADA', user);
  }

  async reopen(id, user) {
    return this.updateStatus(id, 'ABERTA', user);
  }

  async archive(id, user) {
    return this.updateStatus(id, 'ARQUIVADA', user);
  }

  async transfer(id, atendenteId, user) {
    if (user.role !== 'ADMIN') {
      throw new ApiError('Apenas ADMIN pode transferir atendimentos', 403);
    }

    const atendente = await User.findByPk(atendenteId);

    if (!atendente) {
      throw new ApiError('Atendente nao encontrado', 404);
    }

    return this.update(id, { atendente_id: atendenteId }, user);
  }

  getMessagePreview(message) {
    if (message.deleted_at) {
      return 'Mensagem apagada';
    }

    if (message.message) {
      return message.message;
    }

    if (message.message_type === 'IMAGE') {
      return 'Imagem enviada';
    }

    if (message.message_type === 'AUDIO') {
      return 'Audio enviado';
    }

    return 'Arquivo enviado';
  }

  async updateLastInteraction(conversation, message) {
    await conversation.update({
      ultima_mensagem: this.getMessagePreview(message),
      ultima_interacao: message.created_at || new Date()
    });

    return conversation;
  }

  async refreshLastInteractionForMessage(message) {
    const latestMessage = await Message.findOne({
      where: {
        conversation_id: message.conversation_id
      },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!latestMessage || latestMessage.id !== message.id) {
      return null;
    }

    const conversation = await Conversation.findByPk(message.conversation_id);

    if (!conversation) {
      return null;
    }

    return this.updateLastInteraction(conversation, latestMessage);
  }

  async updateStatus(id, status, user) {
    return this.update(id, { status }, user);
  }

  async enrich(conversation, includeDetails = false) {
    const plain = conversation.toJSON();
    const unreadCount = await Message.count({
      where: {
        conversation_id: conversation.id,
        read: false,
        sender_type: 'CLIENTE'
      }
    });

    let cliente = null;

    try {
      cliente = await ClienteService.findById(conversation.cliente_id_externo);
    } catch (error) {
      cliente = {
        id: conversation.cliente_id_externo,
        erro: 'Nao foi possivel carregar dados do cliente'
      };
    }

    const payload = {
      ...plain,
      cliente,
      unread_count: unreadCount
    };

    if (includeDetails) {
      payload.historico = await Conversation.findAll({
        where: {
          cliente_id_externo: conversation.cliente_id_externo,
          id: {
            [Op.ne]: conversation.id
          }
        },
        order: [['created_at', 'DESC']]
      });

      payload.notes = await Note.findAll({
        where: {
          conversation_id: conversation.id
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

    return payload;
  }

  ensureCanAccess(conversation, user) {
    if (user.role === 'ADMIN') {
      return;
    }

    if (!conversation.atendente_id || conversation.atendente_id === user.id) {
      return;
    }

    throw new ApiError('Voce nao tem permissao para acessar esta conversa', 403);
  }
}

module.exports = new ConversationService();

