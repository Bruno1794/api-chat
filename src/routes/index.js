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

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clientes', clienteRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/notes', noteRoutes);
router.use('/shortcuts', shortcutRoutes);
router.use(uploadRoutes);

module.exports = router;
