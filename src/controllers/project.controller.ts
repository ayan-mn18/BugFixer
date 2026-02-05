import { Request, Response, NextFunction } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { Project, User, Bug, ProjectMember, sequelize } from '../db';
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

    // Fetch owned and member projects in parallel
    const [ownedProjects, memberships] = await Promise.all([
      Project.findAll({
        where: { ownerId: userId },
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] },
        ],
        order: [['updatedAt', 'DESC']],
      }),
      ProjectMember.findAll({
        where: { userId },
        include: [
          {
            model: Project,
            as: 'project',
            include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatarUrl'] }],
          },
        ],
      }),
    ]);

    const memberProjects = memberships
      .map((m: any) => m.project)
      .filter((p: any) => p && p.ownerId !== userId);

    // Combine and dedupe
    const allProjects = [...ownedProjects, ...memberProjects];

    if (allProjects.length === 0) {
      res.json({ projects: [] });
      return;
    }

    // Get all project IDs
    const projectIds = allProjects.map((p: any) => p.id);

    // Batch fetch bug counts using raw SQL for efficiency
    const [bugCounts] = await sequelize.query(`
      SELECT 
        project_id,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status != 'DEPLOYED') as open_count
      FROM bugs 
      WHERE project_id IN (:projectIds)
      GROUP BY project_id
    `, {
      replacements: { projectIds },
      type: QueryTypes.SELECT,
      raw: true,
    }) as any;

    // Create a map for quick lookup
    const countsMap = new Map<string, { total: number; open: number }>();
    if (Array.isArray(bugCounts)) {
      bugCounts.forEach((row: any) => {
        countsMap.set(row.project_id, {
          total: parseInt(row.total_count) || 0,
          open: parseInt(row.open_count) || 0,
        });
      });
    }

    // Combine projects with counts
    const projectsWithCounts = allProjects.map((project: any) => {
      const counts = countsMap.get(project.id) || { total: 0, open: 0 };
      return {
        ...project.toJSON(),
        bugCount: counts.total,
        openBugCount: counts.open,
      };
    });

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

    if (projects.length === 0) {
      res.json({ projects: [] });
      return;
    }

    // Batch fetch bug counts using raw SQL for efficiency
    const projectIds = projects.map((p) => p.id);
    const bugCounts = await sequelize.query<{ project_id: string; total_count: string; open_count: string }>(
      `SELECT project_id, COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE status != 'DEPLOYED') as open_count
       FROM bugs WHERE project_id IN (:projectIds) GROUP BY project_id`,
      { replacements: { projectIds }, type: QueryTypes.SELECT, raw: true }
    );

    // Create a map for quick lookup
    const countMap = new Map(bugCounts.map((c) => [c.project_id, c]));

    const projectsWithCounts = projects.map((project) => {
      const counts = countMap.get(project.id);
      return {
        ...project.toJSON(),
        bugCount: counts ? parseInt(counts.total_count, 10) : 0,
        openBugCount: counts ? parseInt(counts.open_count, 10) : 0,
      };
    });

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

    // Fetch project with owner
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

    // Check access and get counts in parallel
    const isOwner = userId === project.ownerId;
    
    // Run membership check and bug counts in parallel
    const [membership, bugCount, openBugCount] = await Promise.all([
      userId && !isOwner 
        ? ProjectMember.findOne({ where: { projectId: project.id, userId } })
        : Promise.resolve(null),
      Bug.count({ where: { projectId: project.id } }),
      Bug.count({ where: { projectId: project.id, status: { [Op.ne]: 'DEPLOYED' } } }),
    ]);

    const isMember = !!membership;
    const userRole = membership?.role || null;

    // If private and no access, deny
    if (!project.isPublic && !isOwner && !isMember) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

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
