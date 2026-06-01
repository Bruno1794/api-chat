'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@admin.com';

    const existingUsers = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      {
        replacements: {
          email: adminEmail
        },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    );

    if (existingUsers.length > 0) {
      return;
    }

    const senha = await bcrypt.hash(
      process.env.ADMIN_DEFAULT_PASSWORD || '123456',
      Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    );

    await queryInterface.bulkInsert('users', [
      {
        nome: process.env.ADMIN_DEFAULT_NAME || 'Administrador',
        email: adminEmail,
        senha,
        role: 'ADMIN',
        online: false,
        ultimo_acesso: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@admin.com'
    });
  }
};