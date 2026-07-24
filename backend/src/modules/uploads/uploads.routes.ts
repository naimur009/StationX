import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { handleUpload } from './uploads.middleware';
import { handleUploadImage } from './uploads.controller';

const router = Router();

router.post(
  '/uploads/image',
  authenticate,
  authorize('uploads', 'create'),
  handleUpload,
  handleUploadImage
);

export default router;
