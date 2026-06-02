const { Router } = require('express');

const PushController = require('../controllers/PushController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.get('/config', PushController.config);
router.post('/subscribe', PushController.subscribe);
router.post('/admin/subscribe', authMiddleware, PushController.subscribeAdmin);
router.post('/pushalert/subscribe', PushController.subscribePushAlert);
router.delete('/subscribe', PushController.unsubscribe);

module.exports = router;
