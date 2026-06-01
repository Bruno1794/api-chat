const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');

class User extends Model {
  static initModel(sequelize) {
    User.init(
      {
        nome: {
          type: DataTypes.STRING,
          allowNull: false
        },

        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true
          }
        },

        senha: {
          type: DataTypes.STRING,
          allowNull: false
        },

        role: {
          type: DataTypes.ENUM('ADMIN', 'ATENDENTE'),
          allowNull: false,
          defaultValue: 'ATENDENTE'
        },

        online: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },

        ultimo_acesso: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'users',
        modelName: 'User',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
          beforeCreate: async user => {
            if (user.senha) {
              user.senha = await bcrypt.hash(
                user.senha,
                Number(process.env.BCRYPT_SALT_ROUNDS || 10)
              );
            }
          },

          beforeUpdate: async user => {
            if (user.changed('senha')) {
              user.senha = await bcrypt.hash(
                user.senha,
                Number(process.env.BCRYPT_SALT_ROUNDS || 10)
              );
            }
          }
        }
      }
    );

    return User;
  }

  async checkPassword(password) {
    return bcrypt.compare(password, this.senha);
  }

  static associate(models) {
    User.hasMany(models.Conversation, {
      foreignKey: 'atendente_id',
      as: 'conversations'
    });

    User.hasMany(models.Note, {
      foreignKey: 'user_id',
      as: 'notes'
    });

    User.hasMany(models.Shortcut, {
      foreignKey: 'user_id',
      as: 'shortcuts'
    });
  }

  toJSON() {
    const values = { ...this.get() };

    delete values.senha;

    return values;
  }
}

module.exports = User;
