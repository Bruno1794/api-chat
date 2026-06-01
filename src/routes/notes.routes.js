const { Router } = require('express');

const NoteController = require('../controllers/NoteController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/:conversationId', NoteController.list);
router.post('/', NoteController.create);
router.delete('/:id', NoteController.delete);

module.exports = router;
