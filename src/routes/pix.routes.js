const { Router } = require('express');

const PixController = require('../controllers/PixController');
const authMiddleware = require('../middlewares/authMiddleware');
const permit = require('../middlewares/permissionMiddleware');

const router = Router();

router.post('/webhook', PixController.webhook);
router.post('/charges', authMiddleware, permit('ADMIN', 'ATENDENTE'), PixController.createCharge);

module.exports = router;
