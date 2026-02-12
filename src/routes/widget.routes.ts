import { Router } from 'express';
import {
  getWidgetSettings,
  generateWidgetToken,
  updateWidgetSettings,
  deleteWidgetToken,
  getWidgetConfig,
  createWidgetBug,
  serveEmbedScript,
} from '../controllers/widget.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { createWidgetBugSchema, updateWidgetSettingsSchema } from '../validators';

const router = Router();

// ============================================================================
// PUBLIC WIDGET ENDPOINTS (no JWT, token-based auth)
// ============================================================================

// GET /api/widget/embed.js - Serve the embed script
router.get('/embed.js', serveEmbedScript);

// GET /api/widget/:token/config - Get widget config for iframe
router.get('/:token/config', getWidgetConfig);

// POST /api/widget/:token/bugs - Create bug via widget
router.post('/:token/bugs', validate(createWidgetBugSchema), createWidgetBug);

// ============================================================================
// AUTHENTICATED WIDGET MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/widget/settings/:slug - Get widget settings
router.get('/settings/:slug', authenticate, getWidgetSettings);

// POST /api/widget/settings/:slug/generate - Generate widget token
router.post('/settings/:slug/generate', authenticate, generateWidgetToken);

// PUT /api/widget/settings/:slug - Update widget settings
router.put('/settings/:slug', authenticate, validate(updateWidgetSettingsSchema), updateWidgetSettings);

// DELETE /api/widget/settings/:slug - Delete widget token
router.delete('/settings/:slug', authenticate, deleteWidgetToken);

export default router;
