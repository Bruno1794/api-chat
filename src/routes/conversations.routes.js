const { Router } = require('express');

const ConversationController = require('../controllers/ConversationController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const permit = require('../middlewares/permissionMiddleware');

const router = Router();

router.post('/', optionalAuthMiddleware, ConversationController.create);

router.use(authMiddleware);

router.get('/client-access/:clienteId', ConversationController.generateClientChatAccess);
router.get('/', ConversationController.list);
router.get('/:id', ConversationController.show);
router.put('/:id', ConversationController.update);
router.delete('/:id', permit('ADMIN'), ConversationController.delete);
router.post('/:id/close', ConversationController.close);
router.post('/:id/reopen', ConversationController.reopen);
router.post('/:id/archive', ConversationController.archive);
router.post('/:id/transfer', permit('ADMIN'), ConversationController.transfer);

module.exports = router;
