const { Router } = require('express');
const HealthController = require('../controllers/HealthController');

const router = Router();

router.get('/health', HealthController.index);

module.exports = router;