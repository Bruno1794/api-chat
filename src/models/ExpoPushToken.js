const { DataTypes, Model } = require('sequelize');

class ExpoPushToken extends Model {
  static initModel(sequelize) {
    ExpoPushToken.init(
      {
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        token: {
          type: DataTypes.STRING,
          allowNull: false
        },

        platform: {
          type: DataTypes.STRING,
          allowNull: true
        },

        device_name: {
          type: DataTypes.STRING,
          allowNull: true
        },

        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        last_registered_at: {
          type: DataTypes.DATE,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'expo_push_tokens',
        modelName: 'ExpoPushToken',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return ExpoPushToken;
  }

  static associate(models) {
    ExpoPushToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

module.exports = ExpoPushToken;
