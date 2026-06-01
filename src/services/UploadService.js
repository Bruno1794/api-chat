const path = require('path');

const ApiError = require('../utils/ApiError');

class UploadService {
  buildFileResponse(file) {
    if (!file) {
      throw new ApiError('Arquivo nao enviado', 422);
    }

    return {
      filename: file.filename,
      original_name: file.originalname,
      path: file.path,
      url: `/files/${file.filename}`,
      mime_type: file.mimetype,
      size: file.size
    };
  }

  getUploadPath(filename) {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new ApiError('Nome de arquivo invalido', 400);
    }

    return path.resolve(process.env.UPLOAD_DIR || 'src/uploads', filename);
  }
}

module.exports = new UploadService();
