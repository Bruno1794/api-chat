require('dotenv').config({ override: true });

const defaultConfig = {
  dialect: process.env.DB_DIALECT || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'api_chat',
    ...defaultConfig
  },

  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: `${process.env.DB_NAME || 'api_chat'}_test`,
    ...defaultConfig
  },

  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...defaultConfig,
    pool: {
      max: 50,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};
