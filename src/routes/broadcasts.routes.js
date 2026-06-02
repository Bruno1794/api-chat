const { Router } = require('express');

const BroadcastController = require('../controllers/BroadcastController');
const authMiddleware = require('../middlewares/authMiddleware');
const permit = require('../middlewares/permissionMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/notice', permit('ADMIN', 'ATENDENTE'), BroadcastController.sendNotice);

module.exports = router;
