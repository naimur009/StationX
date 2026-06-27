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
import userRoutes from './modules/users/users.routes';
import settingsRoutes from './modules/settings/settings.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import couponsRoutes from './modules/coupons/coupons.routes';
import customersRoutes from './modules/customers/customers.routes';
import posRoutes from './modules/pos/pos.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import ordersRoutes from './modules/orders/orders.routes';

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
const userMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/users', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return userMutationLimiter(req, res, next);
  }
  next();
});

app.use('/api/v1', activityLogger);

app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);
const settingsMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/settings', (req, res, next) => {
  if (req.method === 'PUT') return settingsMutationLimiter(req, res, next);
  next();
});
app.use('/api/v1', settingsRoutes);
app.use('/api/v1', categoriesRoutes);
app.use('/api/v1', productsRoutes);
const uploadsMutationLimiter = makeRateLimiter(env.UPLOAD_RATE_LIMIT_MAX);
app.use('/api/v1/uploads/image', uploadsMutationLimiter);
app.use('/api/v1', uploadsRoutes);
const couponsMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/coupons', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return couponsMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', couponsRoutes);
const customersMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/customers', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return customersMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', customersRoutes);
const vendorsMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/vendors', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return vendorsMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', vendorsRoutes);
const expensesMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/expenses', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return expensesMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', expensesRoutes);
app.use('/api/v1', posRoutes);
const ordersMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/orders', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ordersMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', ordersRoutes);

app.use(errorHandler);

export default app;
