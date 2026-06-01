const { Router } = require('express');

const MessageController = require('../controllers/MessageController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');

const router = Router();

router.post('/', optionalAuthMiddleware, MessageController.create);
router.put('/:id', optionalAuthMiddleware, MessageController.update);
router.delete('/:id', optionalAuthMiddleware, MessageController.delete);
router.put('/:id/read', optionalAuthMiddleware, MessageController.markAsRead);
router.put('/:id/reaction', optionalAuthMiddleware, MessageController.react);
router.delete('/:id/reaction', optionalAuthMiddleware, MessageController.deleteReaction);
router.get('/:conversationId', optionalAuthMiddleware, MessageController.list);

router.use(authMiddleware);

module.exports = router;


