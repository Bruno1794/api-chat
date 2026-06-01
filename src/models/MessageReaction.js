const { DataTypes, Model } = require('sequelize');

class MessageReaction extends Model {
  static initModel(sequelize) {
    MessageReaction.init(
      {
        message_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        actor_type: {
          type: DataTypes.ENUM('CLIENTE', 'ATENDENTE'),
          allowNull: false
        },

        actor_id: {
          type: DataTypes.STRING,
          allowNull: true
        },

        emoji: {
          type: DataTypes.STRING,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'message_reactions',
        modelName: 'MessageReaction',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return MessageReaction;
  }

  static associate(models) {
    MessageReaction.belongsTo(models.Message, {
      foreignKey: 'message_id',
      as: 'message'
    });
  }
}

module.exports = MessageReaction;
