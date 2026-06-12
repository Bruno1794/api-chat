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

async function markUserOnline(socket) {
  if (!socket.user) {
    return;
  }

  const lastSeen = new Date();

  await User.update(
    {
      online: true,
      ultimo_acesso: lastSeen
    },
    {
      where: {
        id: socket.user.id
      }
    }
  );

  socket.user.online = true;
  socket.user.ultimo_acesso = lastSeen;
  socket.broadcast.emit('user_online', {
    user_id: socket.user.id,
    online: true,
    ultimo_acesso: lastSeen.toISOString()
  });
}

function markUserOfflineWhenNoSockets(io, socket) {
  if (!socket.user) {
    return;
  }

  const userId = socket.user.id;

  setTimeout(async () => {
    const userRoom = io.sockets.adapter.rooms.get(`user:${userId}`);

    if (userRoom && userRoom.size > 0) {
      return;
    }

    const lastSeen = new Date();

    try {
      await User.update(
        {
          online: false,
          ultimo_acesso: lastSeen
        },
        {
          where: {
            id: userId
          }
        }
      );

      socket.broadcast.emit('user_offline', {
        user_id: userId,
        online: false,
        ultimo_acesso: lastSeen.toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar ultimo acesso do usuario:', error);
    }
  }, 1000);
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
      markUserOnline(socket).catch(error => {
        console.error('Erro ao atualizar presenca do usuario:', error);
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
        markUserOfflineWhenNoSockets(io, socket);
      }

      console.log(`Socket desconectado: ${socket.id}. Motivo: ${reason}`);
    });
  });
}

module.exports = initSockets;
