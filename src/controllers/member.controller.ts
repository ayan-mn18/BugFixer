import { Request, Response, NextFunction } from 'express';
import { User, Project, ProjectMember, AccessRequest } from '../db';
import { AddMemberInput, UpdateMemberRoleInput, CreateAccessRequestInput } from '../validators';
import {
  sendAccessRequestApprovedEmail,
  sendAccessRequestRejectedEmail,
  sendNewAccessRequestEmail,
} from '../services/email.service';

// Get project members
export const getProjectMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user?.id;

    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = userId === project.ownerId;
    let isMember = false;

    if (userId && !isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId, userId },
      });
      isMember = !!membership;
    }

    if (!project.isPublic && !isOwner && !isMember) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get owner
    const owner = (project as any).owner;

    // Get members
    const memberships = await ProjectMember.findAll({
      where: { projectId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
      order: [['createdAt', 'ASC']],
    });

    const members = [
      {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        avatarUrl: owner.avatarUrl,
        role: 'OWNER',
        joinedAt: project.createdAt,
      },
      ...memberships.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    ];

    res.json({ members });
  } catch (error) {
    next(error);
  }
};

// Add member to project
export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const { email, role } = req.body as AddMemberInput;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = userId === project.ownerId;
    let isAdmin = false;

    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only owner or admin can add members' });
      return;
    }

    // Find user by email
    const newMember = await User.findOne({ where: { email } });
    if (!newMember) {
      res.status(404).json({ error: 'User not found with that email' });
      return;
    }

    // Check if already owner
    if (newMember.id === project.ownerId) {
      res.status(400).json({ error: 'User is already the owner of this project' });
      return;
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({
      where: { projectId, userId: newMember.id },
    });
    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this project' });
      return;
    }

    // Add member
    const membership = await ProjectMember.create({
      projectId,
      userId: newMember.id,
      role: role || 'MEMBER',
    });

    res.status(201).json({
      member: {
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        avatarUrl: newMember.avatarUrl,
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update member role
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;
    const { role } = req.body as UpdateMemberRoleInput;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can change member roles' });
      return;
    }

    const membership = await ProjectMember.findOne({
      where: { projectId, userId: memberId },
    });
    if (!membership) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    membership.role = role;
    await membership.save();

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Remove member from project
export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const memberId = req.params.memberId as string;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = project.ownerId === userId;
    const isSelf = memberId === userId;

    if (!isOwner && !isSelf) {
      res.status(403).json({ error: 'Only the owner can remove members, or you can remove yourself' });
      return;
    }

    const membership = await ProjectMember.findOne({
      where: { projectId, userId: memberId },
    });
    if (!membership) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    await membership.destroy();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

// Request access to a project
export const requestAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const { message } = req.body as CreateAccessRequestInput;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const owner = (project as any).owner;

    // Check if already owner or member
    if (project.ownerId === userId) {
      res.status(400).json({ error: 'You are the owner of this project' });
      return;
    }

    const existingMember = await ProjectMember.findOne({
      where: { projectId, userId },
    });
    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this project' });
      return;
    }

    // Check for existing pending request
    const existingRequest = await AccessRequest.findOne({
      where: { projectId, userId, status: 'PENDING' },
    });
    if (existingRequest) {
      res.status(400).json({ error: 'You already have a pending request for this project' });
      return;
    }

    // Create request
    const accessRequest = await AccessRequest.create({
      projectId,
      userId,
      message: message || null,
    });

    // Get requester info for email
    const requester = await User.findByPk(userId);

    // Send email to owner
    try {
      await sendNewAccessRequestEmail(owner.email, owner.name, requester!.name, project.name);
    } catch (emailError) {
      console.error('Failed to send access request email:', emailError);
    }

    res.status(201).json({ accessRequest });
  } catch (error) {
    next(error);
  }
};

// Get access requests for a project (owner only)
export const getAccessRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can view access requests' });
      return;
    }

    const requests = await AccessRequest.findAll({
      where: { projectId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ accessRequests: requests });
  } catch (error) {
    next(error);
  }
};

// Approve access request
export const approveAccessRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const userId = req.user!.id;

    const accessRequest = await AccessRequest.findByPk(requestId, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!accessRequest) {
      res.status(404).json({ error: 'Access request not found' });
      return;
    }

    const project = (accessRequest as any).project;
    const requestUser = (accessRequest as any).user;

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can approve access requests' });
      return;
    }

    if (accessRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Request has already been processed' });
      return;
    }

    // Update request status
    accessRequest.status = 'APPROVED';
    await accessRequest.save();

    // Add user as member
    await ProjectMember.create({
      projectId: project.id,
      userId: accessRequest.userId,
      role: 'MEMBER',
    });

    // Send email notification
    try {
      await sendAccessRequestApprovedEmail(requestUser.email, requestUser.name, project.name);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ message: 'Access request approved' });
  } catch (error) {
    next(error);
  }
};

// Reject access request
export const rejectAccessRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const userId = req.user!.id;

    const accessRequest = await AccessRequest.findByPk(requestId, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!accessRequest) {
      res.status(404).json({ error: 'Access request not found' });
      return;
    }

    const project = (accessRequest as any).project;
    const requestUser = (accessRequest as any).user;

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can reject access requests' });
      return;
    }

    if (accessRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Request has already been processed' });
      return;
    }

    // Update request status
    accessRequest.status = 'REJECTED';
    await accessRequest.save();

    // Send email notification
    try {
      await sendAccessRequestRejectedEmail(requestUser.email, requestUser.name, project.name);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ message: 'Access request rejected' });
  } catch (error) {
    next(error);
  }
};
