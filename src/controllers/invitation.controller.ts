import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Invitation, User, Project, ProjectMember } from '../db';
import logger from '../lib/logger';

// Get invitation details by token (public - for viewing invite before accepting)
export const getInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      where: {
        token,
        status: 'PENDING',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found, expired, or already used'
      });
    }

    return res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        project: invitation.get('project'),
        inviter: invitation.get('inviter'),
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get invitation error');
    return res.status(500).json({
      success: false,
      message: 'Failed to get invitation'
    });
  }
};

// Accept invitation (requires authentication)
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the invitation
    const invitation = await Invitation.findOne({
      where: {
        token,
        status: 'PENDING',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{ model: Project, as: 'project' }]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found, expired, or already used'
      });
    }

    // Verify email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'This invitation was sent to a different email address'
      });
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({
      where: {
        projectId: invitation.projectId,
        userId: userId
      }
    });

    // Get the project to return its slug
    const project = await Project.findByPk(invitation.projectId);

    if (existingMember) {
      // Mark invitation as accepted anyway
      await invitation.update({ status: 'ACCEPTED' });
      
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this project',
        projectSlug: project?.slug
      });
    }

    // Add user as project member
    await ProjectMember.create({
      projectId: invitation.projectId,
      userId: userId,
      role: invitation.role
    });

    // Mark invitation as accepted
    await invitation.update({ status: 'ACCEPTED' });

    return res.json({
      success: true,
      message: 'Invitation accepted successfully',
      projectId: invitation.projectId,
      projectSlug: project?.slug
    });
  } catch (error) {
    logger.error({ err: error }, 'Accept invitation error');
    return res.status(500).json({
      success: false,
      message: 'Failed to accept invitation'
    });
  }
};

// Get pending invitations for current user
export const getMyInvitations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const invitations = await Invitation.findAll({
      where: {
        email: user.email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      invitations: invitations.map(inv => ({
        id: inv.id,
        token: inv.token,
        email: inv.email,
        role: inv.role,
        project: inv.get('project'),
        inviter: inv.get('inviter'),
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      }))
    });
  } catch (error) {
    logger.error({ err: error }, 'Get my invitations error');
    return res.status(500).json({
      success: false,
      message: 'Failed to get invitations'
    });
  }
};
