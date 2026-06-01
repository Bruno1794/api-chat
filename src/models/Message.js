const { DataTypes, Model } = require('sequelize');

class Message extends Model {
  static initModel(sequelize) {
    Message.init(
      {
        conversation_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },

        sender_type: {
          type: DataTypes.ENUM('CLIENTE', 'ATENDENTE', 'SISTEMA'),
          allowNull: false
        },

        sender_id: {
          type: DataTypes.STRING,
          allowNull: true
        },

        message: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        message_type: {
          type: DataTypes.ENUM('TEXT', 'IMAGE', 'FILE', 'AUDIO'),
          allowNull: false,
          defaultValue: 'TEXT'
        },

        read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },

        edited_at: {
          type: DataTypes.DATE,
          allowNull: true
        },

        deleted_at: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'messages',
        modelName: 'Message',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
      }
    );

    return Message;
  }

  static associate(models) {
    Message.belongsTo(models.Conversation, {
      foreignKey: 'conversation_id',
      as: 'conversation'
    });

    Message.hasMany(models.Attachment, {
      foreignKey: 'message_id',
      as: 'attachments'
    });

    Message.hasMany(models.MessageReaction, {
      foreignKey: 'message_id',
      as: 'reactions'
    });
  }
}

module.exports = Message;


