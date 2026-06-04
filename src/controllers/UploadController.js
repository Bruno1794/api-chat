const asyncHandler = require('../middlewares/asyncHandler');
const UploadService = require('../services/UploadService');

class UploadController {
  upload = asyncHandler(async (req, res) => {
    const file = UploadService.buildFileResponse(req.file);

    return res.status(201).json(file);
  });

  uploadBase64 = asyncHandler(async (req, res) => {
    const file = UploadService.saveBase64Image(req.body);

    return res.status(201).json(file);
  });

  uploadBase64Chunk = asyncHandler(async (req, res) => {
    const result = UploadService.saveBase64Chunk(req.body);

    return res.status(result.complete ? 201 : 202).json(result);
  });

  download = asyncHandler(async (req, res) => {
    const filePath = UploadService.getUploadPath(req.params.filename);

    return res.sendFile(filePath);
  });
}

module.exports = new UploadController();
