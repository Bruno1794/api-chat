const asyncHandler = require('../middlewares/asyncHandler');
const MessageService = require('../services/MessageService');

class MessageController {
  list = asyncHandler(async (req, res) => {
    const messages = await MessageService.list(req.params.conversationId, req.user, req.query);

    return res.json(messages);
  });

  create = asyncHandler(async (req, res) => {
    const message = await MessageService.create(req.body, req.user);

    return res.status(201).json(message);
  });

  update = asyncHandler(async (req, res) => {
    const message = await MessageService.update(req.params.id, req.body, req.user);

    return res.json(message);
  });

  delete = asyncHandler(async (req, res) => {
    const message = await MessageService.delete(req.params.id, req.body, req.user);

    return res.json(message);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const message = await MessageService.markAsRead(req.params.id, req.user);

    return res.json(message);
  });

  react = asyncHandler(async (req, res) => {
    const result = await MessageService.react(req.params.id, req.body, req.user);

    return res.json(result);
  });

  deleteReaction = asyncHandler(async (req, res) => {
    const result = await MessageService.deleteReaction(req.params.id, req.body, req.user);

    return res.json(result);
  });
}

module.exports = new MessageController();



