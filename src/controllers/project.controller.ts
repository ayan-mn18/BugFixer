import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Project, User, Bug, ProjectMember } from '../db';
import { CreateProjectInput, UpdateProjectInput } from '../validators';

// Helper to generate slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Get all projects for current user (owned + member)
export const getMyProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get owned projects
    const ownedProjects = await Project.findAll({
      where: { ownerId: userId },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    // Get member projects
    const memberships = await ProjectMember.findAll({
      where: { userId },
      include: [
        {
          model: Project,
          as: 'project',
          include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
        },
      ],
    });

    const memberProjects = memberships
      .map((m: any) => m.project)
      .filter((p: any) => p && p.ownerId !== userId);

    // Combine and dedupe
    const allProjects = [...ownedProjects, ...memberProjects];

    // Add bug counts
    const projectsWithCounts = await Promise.all(
      allProjects.map(async (project: any) => {
        const bugCount = await Bug.count({ where: { projectId: project.id } });
        const openBugCount = await Bug.count({
          where: { projectId: project.id, status: { [Op.ne]: 'DEPLOYED' } },
        });
        return {
          ...project.toJSON(),
          bugCount,
          openBugCount,
        };
      })
    );

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    next(error);
  }
};

// Get public projects
export const getPublicProjects = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projects = await Project.findAll({
      where: { isPublic: true },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Add bug counts
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const bugCount = await Bug.count({ where: { projectId: project.id } });
        const openBugCount = await Bug.count({
          where: { projectId: project.id, status: { [Op.ne]: 'DEPLOYED' } },
        });
        return {
          ...project.toJSON(),
          bugCount,
          openBugCount,
        };
      })
    );

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    next(error);
  }
};

// Get single project by slug
export const getProjectBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const project = await Project.findOne({
      where: { slug },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      ],
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access
    const isOwner = userId === project.ownerId;
    let isMember = false;
    let userRole = null;

    if (userId && !isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      if (membership) {
        isMember = true;
        userRole = membership.role;
      }
    }

    // If private and no access, deny
    if (!project.isPublic && !isOwner && !isMember) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get bug counts
    const bugCount = await Bug.count({ where: { projectId: project.id } });
    const openBugCount = await Bug.count({
      where: { projectId: project.id, status: { [Op.ne]: 'DEPLOYED' } },
    });

    res.json({
      project: {
        ...project.toJSON(),
        bugCount,
        openBugCount,
        userRole: isOwner ? 'OWNER' : userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create project
export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, isPublic } = req.body as CreateProjectInput;
    const userId = req.user!.id;

    // Generate unique slug
    let slug = generateSlug(name);
    const existingSlug = await Project.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const project = await Project.create({
      name,
      description: description || null,
      slug,
      isPublic,
      ownerId: userId,
    });

    // Reload with owner
    await project.reload({
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
    });

    res.status(201).json({
      project: {
        ...project.toJSON(),
        bugCount: 0,
        openBugCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update project
export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, isPublic } = req.body as UpdateProjectInput;
    const userId = req.user!.id;

    const project = await Project.findByPk(id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can update the project' });
      return;
    }

    // Update fields
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (isPublic !== undefined) project.isPublic = isPublic;

    await project.save();

    res.json({ project });
  } catch (error) {
    next(error);
  }
};

// Delete project
export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const project = await Project.findByPk(id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.ownerId !== userId) {
      res.status(403).json({ error: 'Only the owner can delete the project' });
      return;
    }

    await project.destroy();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};
