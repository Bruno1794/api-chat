const { Router } = require('express');

const MaintenanceController = require('../controllers/MaintenanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const permit = require('../middlewares/permissionMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/clear-data', permit('ADMIN'), MaintenanceController.clearData);

module.exports = router;
