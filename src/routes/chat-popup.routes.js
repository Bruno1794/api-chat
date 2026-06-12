const { Router } = require('express');

const ChatPopupController = require('../controllers/ChatPopupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.get('/', ChatPopupController.show);
router.put('/', authMiddleware, ChatPopupController.update);
router.get('/items', authMiddleware, ChatPopupController.list);
router.post('/items', authMiddleware, ChatPopupController.create);
router.put('/items/:id', authMiddleware, ChatPopupController.updateById);
router.delete('/items/:id', authMiddleware, ChatPopupController.deleteById);

module.exports = router;
