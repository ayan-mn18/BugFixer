import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import bugRoutes from './bug.routes';
import memberRoutes from './member.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/bugs', bugRoutes);
router.use('/members', memberRoutes);

export default router;
