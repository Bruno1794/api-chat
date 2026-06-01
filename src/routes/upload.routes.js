const { Router } = require('express');

const UploadController = require('../controllers/UploadController');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = Router();

router.post('/upload', optionalAuthMiddleware, upload.single('file'), UploadController.upload);
router.get('/files/:filename', UploadController.download);

module.exports = router;
