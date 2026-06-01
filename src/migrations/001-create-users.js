'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      nome: {
        type: Sequelize.STRING,
        allowNull: false
      },

      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      senha: {
        type: Sequelize.STRING,
        allowNull: false
      },

      role: {
        type: Sequelize.ENUM('ADMIN', 'ATENDENTE'),
        allowNull: false,
        defaultValue: 'ATENDENTE'
      },

      online: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      ultimo_acesso: {
        type: Sequelize.DATE,
        allowNull: true
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique'
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_index'
    });

    await queryInterface.addIndex('users', ['online'], {
      name: 'users_online_index'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');

    if (queryInterface.sequelize.getDialect() === 'mysql') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS enum_users_role;'
      ).catch(() => {});
    }
  }
};