const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const ApiError = require('../utils/ApiError');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const allowedBase64MimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

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

  saveBase64Image({ filename, mime_type, data }) {
    if (!data) {
      throw new ApiError('Imagem nao enviada', 422);
    }

    const parsed = this.parseBase64Payload(data, mime_type);
    const extension = allowedBase64MimeTypes.get(parsed.mimeType);

    if (!extension) {
      throw new ApiError('Formato de imagem nao suportado', 422);
    }

    const buffer = Buffer.from(parsed.base64, 'base64');

    if (!buffer.length) {
      throw new ApiError('Imagem invalida', 422);
    }

    const savedFilename = `${uuid()}${extension}`;
    const filePath = path.join(uploadDir, savedFilename);

    fs.writeFileSync(filePath, buffer);

    return {
      filename: savedFilename,
      original_name: this.normalizeOriginalName(filename, extension),
      path: filePath,
      url: `/files/${savedFilename}`,
      mime_type: parsed.mimeType === 'image/jpg' ? 'image/jpeg' : parsed.mimeType,
      size: buffer.length
    };
  }

  parseBase64Payload(data, mimeType) {
    const dataUrlMatch = String(data).match(/^data:([^;]+);base64,(.+)$/);

    if (dataUrlMatch) {
      return {
        mimeType: dataUrlMatch[1].toLowerCase(),
        base64: dataUrlMatch[2]
      };
    }

    return {
      mimeType: String(mimeType || '').toLowerCase(),
      base64: String(data)
    };
  }

  normalizeOriginalName(filename, extension) {
    const safeName = String(filename || 'imagem')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/\.[^.]+$/, '');

    return `${safeName || 'imagem'}${extension}`;
  }
}

module.exports = new UploadService();
