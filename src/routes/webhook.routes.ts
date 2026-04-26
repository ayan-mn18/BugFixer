import { Router } from 'express';
import { handleWebhook } from '../controllers/webhook.controller';

const router = Router();

// GitHub sends POST to this endpoint for all configured events
// No auth middleware — webhook uses signature verification instead
router.post('/github', handleWebhook);

export default router;
