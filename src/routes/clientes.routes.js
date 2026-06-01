const { Router } = require('express');

const ClienteController = require('../controllers/ClienteController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', ClienteController.list);
router.get('/search', ClienteController.search);
router.get('/:id', ClienteController.show);

module.exports = router;
