import { uploadToCloudinary, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../lib/upload';
import { createError } from '../../middleware/errorHandler';
import { uploadImageSchema } from './uploads.validation';

export interface UploadResult {
  url: string;
  publicId: string;
}

export function validateFile(mimetype: string, size: number): void {
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw createError(
      400,
      'UNSUPPORTED_FILE_TYPE',
      `File type "${mimetype}" is not supported. Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  if (size > MAX_FILE_SIZE) {
    const maxMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
    throw createError(
      400,
      'FILE_TOO_LARGE',
      `File exceeds the maximum size of ${maxMB}MB`
    );
  }
}

export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  size: number,
  folder: string
): Promise<UploadResult> {
  const parsed = uploadImageSchema.safeParse({ folder });
  if (!parsed.success) {
    throw createError(400, 'VALIDATION_ERROR', 'Invalid folder name');
  }

  validateFile(mimetype, size);
  return uploadToCloudinary(buffer, parsed.data.folder);
}
