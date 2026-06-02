const asyncHandler = require('../middlewares/asyncHandler');
const BroadcastService = require('../services/BroadcastService');

class BroadcastController {
  sendNotice = asyncHandler(async (req, res) => {
    const result = await BroadcastService.sendNotice(req.body, req.user);

    return res.status(202).json(result);
  });
}

module.exports = new BroadcastController();
