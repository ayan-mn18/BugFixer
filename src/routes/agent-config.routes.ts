import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { updateAgentConfigSchema } from '../validators';
import { getAgentConfig, upsertAgentConfig } from '../controllers/agent-config.controller';

const router = Router();

router.get('/:projectId', authenticate, getAgentConfig);
router.put('/:projectId', authenticate, validate(updateAgentConfigSchema), upsertAgentConfig);

export default router;
