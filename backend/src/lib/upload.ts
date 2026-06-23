import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { createError } from '../middleware/errorHandler';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_ROOT_FOLDER}/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(createError(500, 'UPLOAD_FAILED', 'Failed to upload file to storage'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, _result) => {
      if (error) {
        reject(createError(500, 'DELETE_FAILED', 'Failed to delete file from storage'));
        return;
      }
      resolve();
    });
  });
}

export const ALLOWED_MIME_TYPES = env.UPLOAD_ALLOWED_MIME_TYPES.split(',');
export const MAX_FILE_SIZE = env.UPLOAD_MAX_FILE_SIZE;
