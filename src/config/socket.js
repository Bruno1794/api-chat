const { Server } = require('socket.io');
const socketStore = require('../utils/socket');
const { createCorsOptions } = require('./cors');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: createCorsOptions()
  });

  socketStore.setIo(io);

  return io;
}

module.exports = createSocketServer;
