let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  return ioInstance;
}

function emitToAll(event, payload) {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
}

function emitToConversation(conversationId, event, payload) {
  if (ioInstance) {
    ioInstance.to(`conversation:${conversationId}`).emit(event, payload);
  }
}

module.exports = {
  setIo,
  getIo,
  emitToAll,
  emitToConversation
};
