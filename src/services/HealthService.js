const sequelize = require('../database');

class HealthService {
  async check() {
    await sequelize.authenticate();

    return {
      status: 'ok',
      app: 'API Chat',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new HealthService();