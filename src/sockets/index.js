const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

const conversationPresence = new Map();

async function resolveUser(socket) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const decoded = verifyAccessToken(token);

  return User.findByPk(decoded.id);
}

function getConversationId(payload) {
  if (payload && typeof payload === 'object') {
    return payload.conversation_id || payload.id;
  }

  return payload;
}

function getPresencePayload(conversationId) {
  const roomPresence = conversationPresence.get(String(conversationId)) || new Map();
  const participants = Array.from(roomPresence.values());

  return {
    conversation_id: Number(conversationId),
    clientes: participants.filter(item => item.participant_type === 'CLIENTE').length,
    atendentes: participants.filter(item => item.participant_type === 'ATENDENTE').length,
    participants,
    updated_at: new Date().toISOString()
  };
}

function emitPresence(io, conversationId) {
  io.to(`conversation:${conversationId}`).emit(
    'conversation_presence',
    getPresencePayload(conversationId)
  );
}

function joinConversationPresence(io, socket, payload) {
  const conversationId = getConversationId(payload);

  if (!conversationId) {
    return;
  }

  const normalizedId = String(conversationId);
  const room = `conversation:${normalizedId}`;
  const participantType = socket.user ? 'ATENDENTE' : payload?.participant_type || 'CLIENTE';
  const actorId = socket.user?.id || payload?.actor_id || null;

  socket.join(room);

  if (!conversationPresence.has(normalizedId)) {
    conversationPresence.set(normalizedId, new Map());
  }

  conversationPresence.get(normalizedId).set(socket.id, {
    socket_id: socket.id,
    participant_type: participantType,
    actor_id: actorId ? String(actorId) : null,
    joined_at: new Date().toISOString()
  });

  socket.presenceConversations = socket.presenceConversations || new Set();
  socket.presenceConversations.add(normalizedId);

  emitPresence(io, normalizedId);
}

function leaveConversationPresence(io, socket, payload) {
  const conversationId = getConversationId(payload);

  if (!conversationId) {
    return;
  }

  const normalizedId = String(conversationId);
  const roomPresence = conversationPresence.get(normalizedId);

  if (roomPresence) {
    roomPresence.delete(socket.id);

    if (roomPresence.size === 0) {
      conversationPresence.delete(normalizedId);
    }
  }

  socket.presenceConversations?.delete(normalizedId);
  socket.leave(`conversation:${normalizedId}`);
  emitPresence(io, normalizedId);
}

function leaveAllPresence(io, socket) {
  const conversations = Array.from(socket.presenceConversations || []);

  conversations.forEach(conversationId => {
    const roomPresence = conversationPresence.get(conversationId);

    if (roomPresence) {
      roomPresence.delete(socket.id);

      if (roomPresence.size === 0) {
        conversationPresence.delete(conversationId);
      }
    }

    emitPresence(io, conversationId);
  });

  socket.presenceConversations?.clear();
}

function initSockets(io) {
  io.use(async (socket, next) => {
    try {
      const user = await resolveUser(socket);

      if (user) {
        socket.user = user;
      }

      return next();
    } catch (error) {
      return next(new Error('Token invalido'));
    }
  });

  io.on('connection', socket => {
    console.log(`Socket conectado: ${socket.id}`);

    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      socket.broadcast.emit('user_online', {
        user_id: socket.user.id
      });
    }

    socket.emit('connected', {
      socketId: socket.id,
      message: 'Conectado ao servidor Socket.IO'
    });

    socket.on('join_conversation', payload => {
      joinConversationPresence(io, socket, payload);
    });

    socket.on('leave_conversation', payload => {
      leaveConversationPresence(io, socket, payload);
    });

    socket.on('typing', payload => {
      socket.to(`conversation:${payload.conversation_id}`).emit('typing', {
        ...payload,
        socket_id: socket.id
      });
    });

    socket.on('stop_typing', payload => {
      socket.to(`conversation:${payload.conversation_id}`).emit('stop_typing', {
        ...payload,
        socket_id: socket.id
      });
    });

    socket.on('ping_server', payload => {
      socket.emit('pong_server', {
        message: 'pong',
        received: payload || null,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', reason => {
      leaveAllPresence(io, socket);

      if (socket.user) {
        socket.broadcast.emit('user_offline', {
          user_id: socket.user.id
        });
      }

      console.log(`Socket desconectado: ${socket.id}. Motivo: ${reason}`);
    });
  });
}

module.exports = initSockets;
