const { io } = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connected', data => {
  console.log('connected:', data);

  socket.emit('ping_server', {
    message: 'Olá servidor'
  });
});

socket.on('pong_server', data => {
  console.log('pong:', data);
  socket.disconnect();
});