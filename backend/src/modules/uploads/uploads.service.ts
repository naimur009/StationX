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

function sniffImageType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e &&
    buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a &&
    buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
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

  const actualType = sniffImageType(buffer);
  if (!actualType) {
    throw createError(400, 'INVALID_FILE_CONTENT', 'File content does not match a supported image format');
  }
  if (!ALLOWED_MIME_TYPES.includes(actualType)) {
    throw createError(400, 'INVALID_FILE_CONTENT', `File content is ${actualType}, which is not supported`);
  }
  if (actualType !== mimetype) {
    throw createError(
      400,
      'MIME_MISMATCH',
      `Declared file type "${mimetype}" does not match the actual file content (${actualType})`
    );
  }

  return uploadToCloudinary(buffer, parsed.data.folder);
}
