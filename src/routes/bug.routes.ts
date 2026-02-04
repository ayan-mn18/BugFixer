import { Router } from 'express';
import {
  getBugsByProject,
  getBugById,
  createBug,
  updateBug,
  updateBugStatus,
  deleteBug,
} from '../controllers/bug.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { createBugSchema, updateBugSchema, updateBugStatusSchema } from '../validators';

const router = Router();

// GET /api/bugs/project/:projectId - Get bugs for a project
router.get('/project/:projectId', optionalAuth, getBugsByProject);

// GET /api/bugs/:id - Get single bug
router.get('/:id', optionalAuth, getBugById);

// POST /api/bugs - Create a new bug
router.post('/', authenticate, validate(createBugSchema), createBug);

// PUT /api/bugs/:id - Update a bug
router.put('/:id', authenticate, validate(updateBugSchema), updateBug);

// PATCH /api/bugs/:id/status - Update bug status
router.patch('/:id/status', authenticate, validate(updateBugStatusSchema), updateBugStatus);

// DELETE /api/bugs/:id - Delete a bug
router.delete('/:id', authenticate, deleteBug);

export default router;
