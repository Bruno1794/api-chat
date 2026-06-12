const asyncHandler = require('../middlewares/asyncHandler');
const ChatPopupService = require('../services/ChatPopupService');

class ChatPopupController {
  show = asyncHandler(async (req, res) => {
    const config = await ChatPopupService.getConfig();

    return res.json(config);
  });

  update = asyncHandler(async (req, res) => {
    const config = await ChatPopupService.updateConfig(req.body, req.user);

    return res.json(config);
  });

  list = asyncHandler(async (req, res) => {
    const configs = await ChatPopupService.listConfigs(req.user);

    return res.json(configs);
  });

  create = asyncHandler(async (req, res) => {
    const config = await ChatPopupService.createConfig(req.body, req.user);

    return res.status(201).json(config);
  });

  updateById = asyncHandler(async (req, res) => {
    const config = await ChatPopupService.updateById(req.params.id, req.body, req.user);

    return res.json(config);
  });

  deleteById = asyncHandler(async (req, res) => {
    const result = await ChatPopupService.deleteById(req.params.id, req.user);

    return res.json(result);
  });
}

module.exports = new ChatPopupController();
