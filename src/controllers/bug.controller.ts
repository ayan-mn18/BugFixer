import { Request, Response, NextFunction } from 'express';
import { Bug, Project, User, ProjectMember } from '../db';
import { CreateBugInput, UpdateBugInput, UpdateBugStatusInput } from '../validators';
import { sendBugResolvedEmail, sendBugAssignedEmail } from '../services/email.service';
import logger from '../lib/logger';

// Get bugs for a project
export const getBugsByProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user?.id;

    // Check project exists and user has access
    const project = await Project.findByPk(projectId);
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

    const bugs = await Bug.findAll({
      where: { projectId },
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ bugs });
  } catch (error) {
    next(error);
  }
};

// Get single bug
export const getBugById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const bug = await Bug.findByPk(id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'avatarUrl'] },
        { model: Project, as: 'project' },
      ],
    });

    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }

    const project = (bug as any).project;

    // Check access
    if (!project.isPublic && userId !== project.ownerId) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      if (!membership) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    res.json({ bug });
  } catch (error) {
    next(error);
  }
};

// Create bug
export const createBug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, priority, projectId, source, reporterEmail, screenshots } = req.body as CreateBugInput;
    const userId = req.user!.id;

    // Check project exists and user has write access
    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = userId === project.ownerId;
    let memberRole = null;

    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId, userId },
      });
      memberRole = membership?.role;
    }

    const canCreate = isOwner || memberRole === 'ADMIN' || memberRole === 'MEMBER';
    if (!canCreate) {
      res.status(403).json({ error: 'You do not have permission to create bugs in this project' });
      return;
    }

    const bug = await Bug.create({
      title,
      description: description || null,
      priority: priority || 'MEDIUM',
      projectId,
      reporterId: userId,
      source: source || 'INTERNAL_QA',
      reporterEmail: reporterEmail || null,
      screenshots: screenshots || null,
      status: 'TRIAGE',
    });

    // Reload with associations
    await bug.reload({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      ],
    });

    res.status(201).json({ bug });
  } catch (error) {
    next(error);
  }
};

// Update bug
export const updateBug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, description, priority, source, reporterEmail, screenshots } = req.body as UpdateBugInput;
    const userId = req.user!.id;

    const bug = await Bug.findByPk(id, {
      include: [{ model: Project, as: 'project' }],
    });

    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }

    const project = (bug as any).project;
    const isOwner = userId === project.ownerId;
    const isReporter = userId === bug.reporterId;

    let memberRole = null;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      memberRole = membership?.role;
    }

    const canEdit = isOwner || isReporter || memberRole === 'ADMIN' || memberRole === 'MEMBER';
    if (!canEdit) {
      res.status(403).json({ error: 'You do not have permission to update this bug' });
      return;
    }

    // Update fields
    if (title !== undefined) bug.title = title;
    if (description !== undefined) bug.description = description;
    if (priority !== undefined) bug.priority = priority;
    if (source !== undefined) bug.source = source;
    if (reporterEmail !== undefined) bug.reporterEmail = reporterEmail || null;
    if (screenshots !== undefined) bug.screenshots = screenshots || null;

    await bug.save();

    res.json({ bug });
  } catch (error) {
    next(error);
  }
};

// Update bug status (with email notification on DEPLOYED)
export const updateBugStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body as UpdateBugStatusInput;
    const userId = req.user!.id;

    const bug = await Bug.findByPk(id, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }

    const project = (bug as any).project;
    const reporter = (bug as any).reporter;
    const isOwner = userId === project.ownerId;

    let memberRole = null;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      memberRole = membership?.role;
    }

    const canUpdateStatus = isOwner || memberRole === 'ADMIN' || memberRole === 'MEMBER';
    if (!canUpdateStatus) {
      res.status(403).json({ error: 'You do not have permission to update bug status' });
      return;
    }

    bug.status = status;
    await bug.save();

    // Get the user who changed the status (for the resolved email)
    const resolver = await User.findByPk(userId, { attributes: ['id', 'name'] });

    // Send email notification when bug is deployed
    if (status === 'DEPLOYED' && reporter?.email) {
      try {
        await sendBugResolvedEmail(
          reporter.email,
          bug.title,
          project.name,
          resolver?.name || 'A team member',
          bug.id
        );
      } catch (emailError) {
        logger.error({ err: emailError }, 'Failed to send bug resolved email');
      }
    }

    res.json({ bug });
  } catch (error) {
    next(error);
  }
};

// Delete bug
export const deleteBug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const bug = await Bug.findByPk(id, {
      include: [{ model: Project, as: 'project' }],
    });

    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }

    const project = (bug as any).project;
    const isOwner = userId === project.ownerId;
    const isReporter = userId === bug.reporterId;

    let memberRole = null;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      memberRole = membership?.role;
    }

    const canDelete = isOwner || isReporter || memberRole === 'ADMIN';
    if (!canDelete) {
      res.status(403).json({ error: 'You do not have permission to delete this bug' });
      return;
    }

    await bug.destroy();

    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    next(error);
  }
};
