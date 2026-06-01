const HealthService = require('../services/HealthService');
const asyncHandler = require('../middlewares/asyncHandler');

class HealthController {
  index = asyncHandler(async (req, res) => {
    const result = await HealthService.check();

    return res.json(result);
  });
}

module.exports = new HealthController();