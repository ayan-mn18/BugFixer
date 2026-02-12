import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import bugRoutes from './bug.routes';
import memberRoutes from './member.routes';
import invitationRoutes from './invitation.routes';
import uploadRoutes from './upload.routes';
import widgetRoutes from './widget.routes';
import githubRoutes from './github.routes';
import agentConfigRoutes from './agent-config.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/bugs', bugRoutes);
router.use('/members', memberRoutes);
router.use('/invitations', invitationRoutes);
router.use('/upload', uploadRoutes);
router.use('/widget', widgetRoutes);
router.use('/github', githubRoutes);
router.use('/agent-config', agentConfigRoutes);

export default router;
