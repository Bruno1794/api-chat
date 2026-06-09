const { Router } = require('express');

const UploadController = require('../controllers/UploadController');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = Router();

router.post('/upload', optionalAuthMiddleware, upload.single('file'), UploadController.upload);
router.post('/upload/base64', optionalAuthMiddleware, UploadController.uploadBase64);
router.post('/upload/base64-file', optionalAuthMiddleware, UploadController.uploadBase64File);
router.post('/upload/base64-chunk', optionalAuthMiddleware, UploadController.uploadBase64Chunk);
router.get('/files/:filename', UploadController.download);

module.exports = router;
