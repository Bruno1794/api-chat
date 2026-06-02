const conversationPresence = new Map();
const CLIENT_PRESENCE_TTL_MS = 15000;
const ATTENDANT_PRESENCE_TTL_MS = 60000;

function isPresenceExpired(item, now = Date.now()) {
  const lastSeen = new Date(item.last_seen_at || item.joined_at).getTime();
  const ttl =
    item.participant_type === 'CLIENTE' ? CLIENT_PRESENCE_TTL_MS : ATTENDANT_PRESENCE_TTL_MS;

  return Number.isFinite(lastSeen) && now - lastSeen > ttl;
}

function prunePresence(conversationId) {
  const normalizedId = String(conversationId);
  const roomPresence = conversationPresence.get(normalizedId);

  if (!roomPresence) {
    return;
  }

  const now = Date.now();

  roomPresence.forEach((item, socketId) => {
    if (isPresenceExpired(item, now)) {
      roomPresence.delete(socketId);
    }
  });

  if (roomPresence.size === 0) {
    conversationPresence.delete(normalizedId);
  }
}

function getConversationId(payload) {
  if (payload && typeof payload === 'object') {
    return payload.conversation_id || payload.id;
  }

  return payload;
}

function getPresencePayload(conversationId) {
  prunePresence(conversationId);
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
    joined_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  });

  socket.presenceConversations = socket.presenceConversations || new Set();
  socket.presenceConversations.add(normalizedId);

  emitPresence(io, normalizedId);
}

function touchConversationPresence(io, socket, payload) {
  const conversationId = getConversationId(payload);

  if (!conversationId) {
    return;
  }

  const normalizedId = String(conversationId);
  const roomPresence = conversationPresence.get(normalizedId);
  const currentPresence = roomPresence?.get(socket.id);

  if (!currentPresence) {
    joinConversationPresence(io, socket, payload);
    return;
  }

  currentPresence.last_seen_at = new Date().toISOString();
  roomPresence.set(socket.id, currentPresence);
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

function hasClientInConversation(conversationId) {
  return getPresencePayload(conversationId).clientes > 0;
}

module.exports = {
  getConversationId,
  getPresencePayload,
  hasClientInConversation,
  joinConversationPresence,
  leaveConversationPresence,
  leaveAllPresence,
  touchConversationPresence
};
