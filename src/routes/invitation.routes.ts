import { Router } from 'express';
import { getInvitation, acceptInvitation, getMyInvitations } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public route - get invitation details by token (for viewing before accepting)
router.get('/:token', getInvitation);

// Protected routes
router.post('/:token/accept', authenticate, acceptInvitation);
router.get('/', authenticate, getMyInvitations);

export default router;
