const { Router } = require('express');

const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const permit = require('../middlewares/permissionMiddleware');

const router = Router();

router.use(authMiddleware);

router.get('/', permit('ADMIN'), UserController.list);
router.post('/', permit('ADMIN'), UserController.create);
router.put('/:id', permit('ADMIN'), UserController.update);
router.delete('/:id', permit('ADMIN'), UserController.delete);

module.exports = router;
