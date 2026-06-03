const { Op } = require('sequelize');

const {
  Attachment,
  Conversation,
  Message,
  MessageReaction,
  Note,
  PushAlertSubscription,
  PushSubscription,
  sequelize
} = require('../models');

class MaintenanceService {
  async clearOperationalData(user) {
    if (user.role !== 'ADMIN') {
      const ApiError = require('../utils/ApiError');
      throw new ApiError('Apenas administradores podem limpar dados do sistema', 403);
    }

    const deleted = {};

    await sequelize.transaction(async transaction => {
      deleted.pushalert_subscriptions = await PushAlertSubscription.destroy({
        where: {
          [Op.or]: [
            { conversation_id: { [Op.ne]: null } },
            { cliente_id_externo: { [Op.ne]: null } }
          ]
        },
        transaction
      });
      deleted.push_subscriptions = await PushSubscription.destroy({
        where: {
          [Op.or]: [
            { conversation_id: { [Op.ne]: null } },
            { cliente_id_externo: { [Op.ne]: null } }
          ]
        },
        transaction
      });
      deleted.message_reactions = await MessageReaction.destroy({
        where: {},
        transaction
      });
      deleted.attachments = await Attachment.destroy({
        where: {},
        transaction
      });
      deleted.notes = await Note.destroy({
        where: {},
        transaction
      });
      deleted.messages = await Message.destroy({
        where: {},
        transaction
      });
      deleted.conversations = await Conversation.destroy({
        where: {},
        transaction
      });
    });

    return {
      success: true,
      preserved: ['users', 'shortcuts', 'admin_push_subscriptions'],
      deleted
    };
  }
}

module.exports = new MaintenanceService();
