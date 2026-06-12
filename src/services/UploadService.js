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
  ['image/webp', '.webp'],
  ['image/heic', '.heic'],
  ['image/heif', '.heif']
]);

const fallbackMimeTypesByExtension = {
  apk: 'application/vnd.android.package-archive',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm'
};

const chunkDir = path.join(uploadDir, '.chunks');

if (!fs.existsSync(chunkDir)) {
  fs.mkdirSync(chunkDir, {
    recursive: true
  });
}

class UploadService {
  buildFileUrl(filename) {
    const pathUrl = `/files/${filename}`;
    const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');

    return appUrl ? `${appUrl}${pathUrl}` : pathUrl;
  }

  buildFileResponse(file) {
    if (!file) {
      throw new ApiError('Arquivo nao enviado', 422);
    }

    return {
      filename: file.filename,
      original_name: file.originalname,
      path: file.path,
      url: this.buildFileUrl(file.filename),
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
      url: this.buildFileUrl(savedFilename),
      mime_type: parsed.mimeType === 'image/jpg' ? 'image/jpeg' : parsed.mimeType,
      size: buffer.length
    };
  }

  saveBase64File({ filename, mime_type, data }) {
    if (!data) {
      throw new ApiError('Arquivo nao enviado', 422);
    }

    const parsed = this.parseBase64Payload(data, mime_type);
    const safeOriginalName = this.normalizeOriginalName(filename, this.getSafeExtension(filename));
    const extension = this.getSafeExtension(safeOriginalName) || '.bin';
    const buffer = Buffer.from(parsed.base64, 'base64');

    if (!buffer.length) {
      throw new ApiError('Arquivo invalido', 422);
    }

    this.assertBase64Size(buffer);

    const savedFilename = `${uuid()}${extension}`;
    const filePath = path.join(uploadDir, savedFilename);
    const normalizedMimeType = parsed.mimeType || this.getMimeTypeFromExtension(extension) || 'application/octet-stream';

    fs.writeFileSync(filePath, buffer);

    return {
      filename: savedFilename,
      original_name: safeOriginalName,
      path: filePath,
      url: this.buildFileUrl(savedFilename),
      mime_type: normalizedMimeType,
      size: buffer.length
    };
  }

  saveBase64Chunk({ upload_id, filename, mime_type, chunk, index, total }) {
    if (!upload_id || !chunk || index === undefined || !total) {
      throw new ApiError('Dados do chunk sao obrigatorios', 422);
    }

    const safeUploadId = String(upload_id).replace(/[^\w-]/g, '');
    const chunkIndex = Number(index);
    const totalChunks = Number(total);

    if (!safeUploadId || chunkIndex < 0 || totalChunks < 1 || chunkIndex >= totalChunks) {
      throw new ApiError('Chunk invalido', 422);
    }

    const uploadPath = path.join(chunkDir, safeUploadId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, {
        recursive: true
      });
    }

    fs.writeFileSync(path.join(uploadPath, `${chunkIndex}.part`), Buffer.from(String(chunk), 'base64'));

    if (chunkIndex < totalChunks - 1) {
      return {
        complete: false,
        received: chunkIndex + 1
      };
    }

    return this.completeChunkedBase64Upload({
      uploadPath,
      filename,
      mime_type,
      totalChunks
    });
  }

  completeChunkedBase64Upload({ uploadPath, filename, mime_type, totalChunks }) {
    const extension = allowedBase64MimeTypes.get(String(mime_type || '').toLowerCase());

    if (!extension) {
      throw new ApiError('Formato de imagem nao suportado', 422);
    }

    const buffers = [];

    for (let index = 0; index < totalChunks; index += 1) {
      const partPath = path.join(uploadPath, `${index}.part`);

      if (!fs.existsSync(partPath)) {
        throw new ApiError('Upload incompleto', 422);
      }

      buffers.push(fs.readFileSync(partPath));
    }

    const buffer = Buffer.concat(buffers);
    const savedFilename = `${uuid()}${extension}`;
    const filePath = path.join(uploadDir, savedFilename);

    fs.writeFileSync(filePath, buffer);
    fs.rmSync(uploadPath, { recursive: true, force: true });

    return {
      complete: true,
      file: {
        filename: savedFilename,
        original_name: this.normalizeOriginalName(filename, extension),
        path: filePath,
        url: this.buildFileUrl(savedFilename),
        mime_type: mime_type === 'image/jpg' ? 'image/jpeg' : mime_type,
        size: buffer.length
      }
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

  getSafeExtension(filename) {
    const extension = path.extname(String(filename || '')).toLowerCase();

    if (!extension || extension.includes('/') || extension.includes('\\') || extension.includes('..')) {
      return '';
    }

    return extension.replace(/[^.a-z0-9]/g, '').slice(0, 16);
  }

  getMimeTypeFromExtension(extension) {
    const key = String(extension || '').replace(/^\./, '').toLowerCase();

    return fallbackMimeTypesByExtension[key];
  }

  assertBase64Size(buffer) {
    const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 20);

    if (maxSizeMb > 0 && buffer.length > maxSizeMb * 1024 * 1024) {
      throw new ApiError(`Arquivo excede o limite de ${maxSizeMb}MB`, 413);
    }
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
