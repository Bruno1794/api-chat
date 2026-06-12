const { Router } = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const clienteRoutes = require('./clientes.routes');
const conversationRoutes = require('./conversations.routes');
const messageRoutes = require('./messages.routes');
const noteRoutes = require('./notes.routes');
const uploadRoutes = require('./upload.routes');
const shortcutRoutes = require('./shortcuts.routes');
const pushRoutes = require('./push.routes');
const PushController = require('../controllers/PushController');
const authMiddleware = require('../middlewares/authMiddleware');
const broadcastRoutes = require('./broadcasts.routes');
const maintenanceRoutes = require('./maintenance.routes');
const pixRoutes = require('./pix.routes');
const chatPopupRoutes = require('./chat-popup.routes');

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clientes', clienteRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/notes', noteRoutes);
router.use('/shortcuts', shortcutRoutes);
router.use('/push', pushRoutes);
router.post('/push-tokens', authMiddleware, PushController.subscribeAdminExpo);
router.use('/broadcasts', broadcastRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/pix', pixRoutes);
router.use('/chat-popup', chatPopupRoutes);
router.use(uploadRoutes);

module.exports = router;
