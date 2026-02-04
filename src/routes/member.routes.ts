import { Router } from 'express';
import {
  getProjectMembers,
  addMember,
  updateMemberRole,
  removeMember,
  requestAccess,
  getAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from '../controllers/member.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/common.middleware';
import { addMemberSchema, updateMemberRoleSchema, createAccessRequestSchema } from '../validators';

const router = Router();

// GET /api/members/:projectId - Get project members
router.get('/:projectId', optionalAuth, getProjectMembers);

// POST /api/members/:projectId - Add member to project
router.post('/:projectId', authenticate, validate(addMemberSchema), addMember);

// PUT /api/members/:projectId/:memberId - Update member role
router.put('/:projectId/:memberId', authenticate, validate(updateMemberRoleSchema), updateMemberRole);

// DELETE /api/members/:projectId/:memberId - Remove member from project
router.delete('/:projectId/:memberId', authenticate, removeMember);

// POST /api/members/:projectId/request - Request access to project
router.post('/:projectId/request', authenticate, validate(createAccessRequestSchema), requestAccess);

// GET /api/members/:projectId/requests - Get access requests for project
router.get('/:projectId/requests', authenticate, getAccessRequests);

// POST /api/members/requests/:requestId/approve - Approve access request
router.post('/requests/:requestId/approve', authenticate, approveAccessRequest);

// POST /api/members/requests/:requestId/reject - Reject access request
router.post('/requests/:requestId/reject', authenticate, rejectAccessRequest);

export default router;
