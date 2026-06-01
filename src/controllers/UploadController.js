const asyncHandler = require('../middlewares/asyncHandler');
const UploadService = require('../services/UploadService');

class UploadController {
  upload = asyncHandler(async (req, res) => {
    const file = UploadService.buildFileResponse(req.file);

    return res.status(201).json(file);
  });

  download = asyncHandler(async (req, res) => {
    const filePath = UploadService.getUploadPath(req.params.filename);

    return res.sendFile(filePath);
  });
}

module.exports = new UploadController();
