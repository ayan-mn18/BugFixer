import { Router } from 'express';
import {
  getMyProjects,
  getPublicProjects,
  getProjectBySlug,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { createProjectSchema, updateProjectSchema } from '../validators';

const router = Router();

// GET /api/projects - Get current user's projects (owned + member)
router.get('/', authenticate, getMyProjects);

// GET /api/projects/public - Get all public projects
router.get('/public', getPublicProjects);

// GET /api/projects/:slug - Get project by slug
router.get('/:slug', optionalAuth, getProjectBySlug);

// POST /api/projects - Create a new project
router.post('/', authenticate, validate(createProjectSchema), createProject);

// PUT /api/projects/:id - Update a project
router.put('/:id', authenticate, validate(updateProjectSchema), updateProject);

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', authenticate, deleteProject);

export default router;
