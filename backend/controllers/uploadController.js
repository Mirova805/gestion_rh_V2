const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers d\'images sont autorisés !'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Le fichier a uploadé est introuvable.' });
    }

    const ext = path.extname(req.file.originalname);
    const buffer = req.file.buffer;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const finalFilename = `${hash}${ext}`;
    const finalPath = path.join(uploadDir, finalFilename);

    if (!fs.existsSync(finalPath)) {
      fs.writeFileSync(finalPath, buffer);
    }

    const filePath = `/uploads/${finalFilename}`;
    res.status(200).json({
      message: 'L\'image a été uploadé avec succès.',
      filePath,
      filename: finalFilename
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadImage };
