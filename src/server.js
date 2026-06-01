require('dotenv').config({ override: true });

const http = require('http');

const app = require('./app');
const sequelize = require('./database');
require('./models');

const createSocketServer = require('./config/socket');
const initSockets = require('./sockets');

const port = process.env.PORT || 3001;
const host = process.env.API_HOST || '0.0.0.0';

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log('Banco de dados conectado com sucesso.');

    const httpServer = http.createServer(app);

    const io = createSocketServer(httpServer);

    initSockets(io);

    httpServer.listen(port, host, () => {
      console.log(`Servidor rodando em ${host}:${port}`);
      console.log(`Health check: ${process.env.APP_URL || `http://localhost:${port}`}/health`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
