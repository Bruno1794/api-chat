const { Router } = require('express');

const ChatPopupController = require('../controllers/ChatPopupController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.get('/', ChatPopupController.show);
router.put('/', authMiddleware, ChatPopupController.update);

module.exports = router;
