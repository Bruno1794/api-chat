const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(null, `${uuid()}${extension}`);
  }
});

const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 20);
const limits = maxSizeMb > 0
  ? {
      fileSize: maxSizeMb * 1024 * 1024
    }
  : undefined;

const upload = multer({
  storage,
  limits
});

module.exports = upload;
