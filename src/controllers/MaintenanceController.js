const MaintenanceService = require('../services/MaintenanceService');
const asyncHandler = require('../middlewares/asyncHandler');

class MaintenanceController {
  clearData = asyncHandler(async (req, res) => {
    const result = await MaintenanceService.clearOperationalData(req.user);

    return res.json(result);
  });
}

module.exports = new MaintenanceController();
