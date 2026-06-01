const { DataTypes, Model } = require('sequelize');

class Conversation extends Model {
  static initModel(sequelize) {
    Conversation.init(
      {
        cliente_id_externo: {
          type: DataTypes.STRING,
          allowNull: false
        },

        atendente_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },

        status: {
          type: DataTypes.ENUM(
            'ABERTA',
            'AGUARDANDO_CLIENTE',
            'FINALIZADA',
            'ARQUIVADA'
          ),
          allowNull: false,
          defaultValue: 'ABERTA'
        },

        ultima_mensagem: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        ultima_interacao: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      },
      {
        sequelize,
        tableName: 'conversations',
        modelName: 'Conversation',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return Conversation;
  }

  static associate(models) {
    Conversation.belongsTo(models.User, {
      foreignKey: 'atendente_id',
      as: 'atendente'
    });

    Conversation.hasMany(models.Message, {
      foreignKey: 'conversation_id',
      as: 'messages'
    });

    Conversation.hasMany(models.Note, {
      foreignKey: 'conversation_id',
      as: 'notes'
    });
  }
}

module.exports = Conversation;
