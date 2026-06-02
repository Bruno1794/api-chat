const { Router } = require('express');

const PushController = require('../controllers/PushController');

const router = Router();

router.get('/config', PushController.config);
router.post('/subscribe', PushController.subscribe);
router.post('/pushalert/subscribe', PushController.subscribePushAlert);
router.delete('/subscribe', PushController.unsubscribe);

module.exports = router;
