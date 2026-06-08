const asyncHandler = require('../middlewares/asyncHandler');
const PixService = require('../services/PixService');

class PixController {
  createCharge = asyncHandler(async (req, res) => {
    const result = await PixService.createCharge(req.body, req.user);

    return res.status(201).json(result);
  });

  webhook = asyncHandler(async (req, res) => {
    const result = await PixService.handleWebhook(req.body);

    return res.json(result);
  });
}

module.exports = new PixController();
