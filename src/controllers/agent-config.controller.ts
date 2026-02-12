import { Request, Response, NextFunction } from 'express';
import { Project, ProjectMember, AgentConfig } from '../db';
import { AIProvider } from '../db/models/AgentConfig';
import { UpdateAgentConfigInput } from '../validators';

// ─── Get Agent Config ────────────────────────────────────────────────
// GET /api/agent-config/:projectId
export const getAgentConfig = async (
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

    // Check access
    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    let agentConfig = await AgentConfig.findOne({ where: { projectId } });

    // Return defaults if none exists
    if (!agentConfig) {
      res.json({
        config: {
          projectId,
          enabled: false,
          aiProvider: 'OPENAI',
          aiModel: 'gpt-4o-mini',
          systemPrompt: null,
          autoAssign: true,
          targetBranch: 'main',
          prBranchPrefix: 'bugfix/',
        },
      });
      return;
    }

    res.json({ config: agentConfig });
  } catch (error) {
    next(error);
  }
};

// ─── Upsert Agent Config ─────────────────────────────────────────────
// PUT /api/agent-config/:projectId
export const upsertAgentConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;
    const body = req.body as UpdateAgentConfigInput;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Only OWNER or ADMIN
    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || membership.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only project owners and admins can configure the AI agent' });
        return;
      }
    }

    let agentConfig = await AgentConfig.findOne({ where: { projectId } });

    if (agentConfig) {
      // Update existing
      if (body.enabled !== undefined) agentConfig.enabled = body.enabled;
      if (body.aiProvider !== undefined) agentConfig.aiProvider = body.aiProvider as AIProvider;
      if (body.aiModel !== undefined) agentConfig.aiModel = body.aiModel;
      if (body.systemPrompt !== undefined) agentConfig.systemPrompt = body.systemPrompt;
      if (body.autoAssign !== undefined) agentConfig.autoAssign = body.autoAssign;
      if (body.targetBranch !== undefined) agentConfig.targetBranch = body.targetBranch;
      if (body.prBranchPrefix !== undefined) agentConfig.prBranchPrefix = body.prBranchPrefix;
      await agentConfig.save();
    } else {
      // Create new
      agentConfig = await AgentConfig.create({
        projectId,
        ...(body as any),
      });
    }

    res.json({ config: agentConfig });
  } catch (error) {
    next(error);
  }
};
