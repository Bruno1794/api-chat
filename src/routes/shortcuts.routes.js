const { Router } = require('express');

const ShortcutController = require('../controllers/ShortcutController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', ShortcutController.list);
router.get('/suggestions', ShortcutController.suggestions);
router.post('/', ShortcutController.create);
router.put('/:id', ShortcutController.update);
router.delete('/:id', ShortcutController.delete);

module.exports = router;
