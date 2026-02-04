import { Router } from 'express';
import { signup, login, logout, me, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { signupSchema, loginSchema, updateProfileSchema } from '../validators';

const router = Router();

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), signup);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', authenticate, me);

// PUT /api/auth/profile
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
