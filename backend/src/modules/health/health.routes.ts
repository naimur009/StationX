import { Router } from 'express';
import { handleHealth } from './health.controller';

const router = Router();

router.get('/health', handleHealth);

export default router;
