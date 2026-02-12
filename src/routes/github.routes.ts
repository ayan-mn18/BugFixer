import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { connectRepoSchema } from '../validators';
import {
  initiateOAuth,
  handleCallback,
  getIntegrationStatus,
  listRepos,
  connectRepo,
  disconnectRepo,
  disconnectIntegration,
} from '../controllers/github.controller';

const router = Router();

// OAuth flow
router.get('/auth/:projectId', authenticate, initiateOAuth);
router.get('/callback', handleCallback); // No auth — GitHub redirects here

// Integration status
router.get('/status/:projectId', authenticate, getIntegrationStatus);

// Repo management
router.get('/repos/:projectId', authenticate, listRepos);
router.post('/repos/:projectId', authenticate, validate(connectRepoSchema), connectRepo);
router.delete('/repos/:projectId/:repoId', authenticate, disconnectRepo);

// Disconnect integration
router.delete('/:projectId', authenticate, disconnectIntegration);

export default router;
