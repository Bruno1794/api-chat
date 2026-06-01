const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database');

const environment = process.env.NODE_ENV || 'development';
const config = databaseConfig[environment];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

module.exports = sequelize;