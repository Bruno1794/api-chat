const sequelize = require('../database');

const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Attachment = require('./Attachment');
const Note = require('./Note');
const Shortcut = require('./Shortcut');
const MessageReaction = require('./MessageReaction');
const PushSubscription = require('./PushSubscription');
const PushAlertSubscription = require('./PushAlertSubscription');

const models = {
  User: User.initModel(sequelize),
  Conversation: Conversation.initModel(sequelize),
  Message: Message.initModel(sequelize),
  Attachment: Attachment.initModel(sequelize),
  Note: Note.initModel(sequelize),
  Shortcut: Shortcut.initModel(sequelize),
  MessageReaction: MessageReaction.initModel(sequelize),
  PushSubscription: PushSubscription.initModel(sequelize),
  PushAlertSubscription: PushAlertSubscription.initModel(sequelize)
};

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

models.sequelize = sequelize;

module.exports = models;
