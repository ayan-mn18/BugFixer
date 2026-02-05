import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, Project, ProjectMember, AccessRequest, Invitation } from '../db';
import { AddMemberInput, UpdateMemberRoleInput, CreateAccessRequestInput } from '../validators';
import {
  sendAccessRequestApprovedEmail,
  sendAccessRequestRejectedEmail,
  sendNewAccessRequestEmail,
  sendProjectInvitationEmail,
  sendMemberRemovedEmail,
  sendRoleChangedEmail,
} from '../services/email.service';
import config from '../config';

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

    // Return members with nested user object matching frontend expectations
    const members = memberships.map((m: any) => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      user: m.user ? {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      } : null,
      role: m.role,
      invitedBy: m.invitedBy,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    res.json({ members, owner });
  } catch (error) {
    next(error);
  }
};

// Add member to project (or create invitation if user doesn't exist)
export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const { email, role } = req.body as AddMemberInput;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const inviter = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] });
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
    
    if (newMember) {
      // User exists - add them directly
      
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

      // Add member directly
      const membership = await ProjectMember.create({
        projectId,
        userId: newMember.id,
        role: role || 'MEMBER',
        invitedBy: userId,
      });

      res.status(201).json({
        message: 'Member added successfully',
        member: {
          id: membership.id,
          projectId: membership.projectId,
          userId: membership.userId,
          role: membership.role,
          invitedBy: membership.invitedBy,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
          user: {
            id: newMember.id,
            name: newMember.name,
            email: newMember.email,
            avatarUrl: newMember.avatarUrl,
          },
        },
      });
    } else {
      // User doesn't exist - create an invitation
      
      // Check for existing pending invitation
      const existingInvite = await Invitation.findOne({
        where: { email, projectId, status: 'PENDING' },
      });
      if (existingInvite) {
        res.status(400).json({ error: 'An invitation has already been sent to this email' });
        return;
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const invitation = await Invitation.create({
        email,
        projectId,
        role: role || 'MEMBER',
        invitedBy: userId,
        token,
        expiresAt,
      });

      // Send invitation email
      const inviteLink = `${config.cors.origin}/invite/${token}`;
      await sendProjectInvitationEmail(
        email,
        inviter?.name || 'A project owner',
        inviter?.email || '',
        project.name,
        project.description || '',
        role || 'Member',
        token
      );

      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
      });
    }
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
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
    if (!membership) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const memberUser = (membership as any).user;
    const oldRole = membership.role;
    membership.role = role;
    await membership.save();

    // Send role change notification email
    try {
      await sendRoleChangedEmail(memberUser.email, project.name, oldRole, role);
    } catch (emailError) {
      console.error('Failed to send role change email:', emailError);
    }

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
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
    if (!membership) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const memberUser = (membership as any).user;
    await membership.destroy();

    // Send removal notification email (only if owner removed the member, not if self-removal)
    if (!isSelf && memberUser) {
      try {
        await sendMemberRemovedEmail(memberUser.email, project.name);
      } catch (emailError) {
        console.error('Failed to send member removal email:', emailError);
      }
    }

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
      await sendNewAccessRequestEmail(
        owner.email,
        project.name,
        requester!.name,
        requester!.email,
        message || ''
      );
    } catch (emailError) {
      console.error('Failed to send access request email:', emailError);
    }

    res.status(201).json({ accessRequest });
  } catch (error) {
    next(error);
  }
};

// Get access requests for a project (owner or admin only)
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

    // Check if user is owner or admin
    const isOwner = project.ownerId === userId;
    let isAdmin = false;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      // Return empty array instead of error for non-admins
      res.json({ accessRequests: [] });
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
      await sendAccessRequestApprovedEmail(requestUser.email, project.name, 'MEMBER');
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
      await sendAccessRequestRejectedEmail(requestUser.email, project.name);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ message: 'Access request rejected' });
  } catch (error) {
    next(error);
  }
};
