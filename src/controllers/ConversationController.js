const asyncHandler = require('../middlewares/asyncHandler');
const ConversationService = require('../services/ConversationService');

class ConversationController {
  list = asyncHandler(async (req, res) => {
    const conversations = await ConversationService.list({
      user: req.user,
      query: req.query
    });

    return res.json(conversations);
  });

  show = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.findById(req.params.id, req.user);

    return res.json(conversation);
  });

  create = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.create(req.body, req.user);

    return res.status(201).json(conversation);
  });

  generateClientChatAccess = asyncHandler(async (req, res) => {
    const access = await ConversationService.generateClientChatAccess(
      req.params.clienteId
    );

    return res.json(access);
  });

  update = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.update(
      req.params.id,
      req.body,
      req.user
    );

    return res.json(conversation);
  });

  delete = asyncHandler(async (req, res) => {
    const result = await ConversationService.delete(req.params.id, req.user);

    return res.json(result);
  });

  close = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.close(req.params.id, req.user);

    return res.json(conversation);
  });

  reopen = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.reopen(req.params.id, req.user);

    return res.json(conversation);
  });

  archive = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.archive(req.params.id, req.user);

    return res.json(conversation);
  });

  transfer = asyncHandler(async (req, res) => {
    const conversation = await ConversationService.transfer(
      req.params.id,
      req.body.atendente_id,
      req.user
    );

    return res.json(conversation);
  });
}

module.exports = new ConversationController();
