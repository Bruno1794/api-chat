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
}

module.exports = new ChatPopupController();
