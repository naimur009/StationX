import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { createError } from '../../middleware/errorHandler';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../lib/upload';
import { handleUploadImage } from './uploads.controller';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(createError(400, 'UNSUPPORTED_FILE_TYPE', `File type "${file.mimetype}" is not supported. Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  '/uploads/image',
  authenticate,
  authorize('uploads', 'create'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
            next(createError(400, 'FILE_TOO_LARGE', `File exceeds the maximum size of ${maxMB}MB`));
            return;
          }
          next(createError(400, 'VALIDATION_ERROR', err.message));
          return;
        }
        next(err);
        return;
      }
      next();
    });
  },
  handleUploadImage
);

export default router;
