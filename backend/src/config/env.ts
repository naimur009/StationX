import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  SEED_ADMIN_EMAIL: z.string().email('SEED_ADMIN_EMAIL must be a valid email').optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters').optional(),
  EMAIL_FROM: z.string().email().optional().default('noreply@stationx.com'),
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.coerce.number().optional().default(587),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASS: z.string().optional().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().default(30),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().default(5),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_ROOT_FOLDER: z.string().default('stationx'),
  UPLOAD_MAX_FILE_SIZE: z.coerce.number().default(5242880),
  UPLOAD_ALLOWED_MIME_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  parsed.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
