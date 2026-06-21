import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, createError } from './middleware/errorHandler';
import { activityLogger } from './middleware/activityLogger';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", env.FRONTEND_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const csrfProtectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
app.use((req, _res, next) => {
  if (csrfProtectedMethods.includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const allowed = new URL(env.FRONTEND_URL).origin;

    const requestOrigin = origin || (referer ? new URL(referer).origin : null);

    if (!requestOrigin) {
      return next(createError(403, 'FORBIDDEN', 'Cross-origin request rejected'));
    }

    if (requestOrigin !== allowed) {
      return next(createError(403, 'FORBIDDEN', 'Cross-origin request rejected'));
    }
  }
  next();
});

function makeRateLimiter(max: number) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please try again later.',
      },
    },
  });
}

app.use('/api/v1/auth/login', makeRateLimiter(env.RATE_LIMIT_MAX));           // 10/15min
app.use('/api/v1/auth/refresh', makeRateLimiter(env.RATE_LIMIT_REFRESH_MAX)); // 30/15min
app.use('/api/v1/auth/forgot-password', makeRateLimiter(env.RATE_LIMIT_STRICT_MAX)); // 5/15min
app.use('/api/v1/auth/reset-password', makeRateLimiter(env.RATE_LIMIT_STRICT_MAX));  // 5/15min

app.use('/api/v1', activityLogger);

app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);

app.use(errorHandler);

export default app;
