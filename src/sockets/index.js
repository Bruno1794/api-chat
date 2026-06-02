const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const {
  joinConversationPresence,
  leaveConversationPresence,
  leaveAllPresence,
  touchConversationPresence
} = require('../utils/conversationPresence');

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

    socket.on('conversation_presence_ping', payload => {
      touchConversationPresence(io, socket, payload);
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
