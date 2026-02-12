import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Project, ProjectMember, GitHubIntegration, GitHubRepo } from '../db';
import { encrypt } from '../services/crypto.service';
import * as githubService from '../services/github.service';
import config from '../config';
import logger from '../lib/logger';

// ─── Initiate GitHub OAuth ──────────────────────────────────────────
// GET /api/github/auth/:projectId
export const initiateOAuth = async (
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

    // Only OWNER or ADMIN can connect GitHub
    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || membership.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only project owners and admins can connect GitHub' });
        return;
      }
    }

    // Encode project info in state (signed to prevent tampering)
    const statePayload = JSON.stringify({ projectId, userId, ts: Date.now() });
    const stateToken = Buffer.from(statePayload).toString('base64url');

    const authUrl = githubService.buildOAuthUrl(stateToken);
    res.json({ url: authUrl });
  } catch (error) {
    next(error);
  }
};

// ─── GitHub OAuth Callback ──────────────────────────────────────────
// GET /api/github/callback
export const handleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    // Decode state
    let stateData: { projectId: string; userId: string; ts: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    // Exchange code for token
    const { accessToken } = await githubService.exchangeCodeForToken(code);

    // Get GitHub user info
    const ghUser = await githubService.getGitHubUser(accessToken);

    // Encrypt token before storage
    const encryptedToken = encrypt(accessToken);

    // Upsert integration
    const [integration] = await GitHubIntegration.upsert({
      id: crypto.randomUUID(),
      projectId: stateData.projectId,
      githubAccessToken: encryptedToken,
      githubUserId: String(ghUser.id),
      githubUsername: ghUser.login,
      connectedBy: stateData.userId,
    });

    logger.info(
      { projectId: stateData.projectId, githubUsername: ghUser.login },
      'GitHub integration connected'
    );

    // Redirect to frontend settings page
    const frontendUrl = config.frontendUrl || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/projects/${stateData.projectId}?tab=github&connected=true`);
  } catch (error) {
    next(error);
  }
};

// ─── Get Integration Status ─────────────────────────────────────────
// GET /api/github/status/:projectId
export const getIntegrationStatus = async (
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

    const integration = await GitHubIntegration.findOne({
      where: { projectId },
      include: [{ model: GitHubRepo, as: 'repos' }],
    });

    if (!integration) {
      res.json({ connected: false, integration: null });
      return;
    }

    res.json({
      connected: true,
      integration: {
        id: integration.id,
        githubUsername: integration.githubUsername,
        connectedAt: integration.createdAt,
        repos: (integration as any).repos || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── List User's GitHub Repos ────────────────────────────────────────
// GET /api/github/repos/:projectId
export const listRepos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Only OWNER/ADMIN
    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || !['ADMIN'].includes(membership.role)) {
        res.status(403).json({ error: 'Only project owners and admins can manage GitHub repos' });
        return;
      }
    }

    const integration = await GitHubIntegration.findOne({ where: { projectId } });
    if (!integration) {
      res.status(400).json({ error: 'GitHub is not connected for this project' });
      return;
    }

    const result = await githubService.getUserRepos(integration.githubAccessToken, page);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── Connect a Repo ──────────────────────────────────────────────────
// POST /api/github/repos/:projectId
export const connectRepo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;
    const { repoOwner, repoName, repoFullName, isDefault, autoCreateIssues, labelSync } = req.body;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || membership.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only project owners and admins can connect repos' });
        return;
      }
    }

    const integration = await GitHubIntegration.findOne({ where: { projectId } });
    if (!integration) {
      res.status(400).json({ error: 'GitHub is not connected for this project' });
      return;
    }

    // If making this default, unset other defaults
    if (isDefault) {
      await GitHubRepo.update(
        { isDefault: false },
        { where: { integrationId: integration.id } }
      );
    }

    const repo = await GitHubRepo.create({
      integrationId: integration.id,
      repoOwner,
      repoName,
      repoFullName,
      isDefault: isDefault || false,
      autoCreateIssues: autoCreateIssues !== undefined ? autoCreateIssues : true,
      labelSync: labelSync || false,
    });

    // Sync labels if requested
    if (labelSync) {
      try {
        await githubService.syncLabels(integration.githubAccessToken, repoOwner, repoName);
      } catch (err) {
        logger.warn({ err, repoFullName }, 'Failed to sync labels — continuing anyway');
      }
    }

    res.status(201).json({ repo });
  } catch (error) {
    next(error);
  }
};

// ─── Disconnect a Repo ───────────────────────────────────────────────
// DELETE /api/github/repos/:projectId/:repoId
export const disconnectRepo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const repoId = req.params.repoId as string;
    const userId = req.user!.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || membership.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only project owners and admins can disconnect repos' });
        return;
      }
    }

    const integration = await GitHubIntegration.findOne({ where: { projectId } });
    if (!integration) {
      res.status(400).json({ error: 'GitHub is not connected' });
      return;
    }

    const repo = await GitHubRepo.findOne({
      where: { id: repoId, integrationId: integration.id },
    });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    await repo.destroy();
    res.json({ message: 'Repo disconnected' });
  } catch (error) {
    next(error);
  }
};

// ─── Disconnect GitHub Integration ───────────────────────────────────
// DELETE /api/github/:projectId
export const disconnectIntegration = async (
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

    const isOwner = userId === project.ownerId;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({ where: { projectId, userId } });
      if (!membership || membership.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only project owners and admins can disconnect GitHub' });
        return;
      }
    }

    const integration = await GitHubIntegration.findOne({ where: { projectId } });
    if (!integration) {
      res.status(404).json({ error: 'No GitHub integration found' });
      return;
    }

    // Delete all connected repos first, then the integration
    await GitHubRepo.destroy({ where: { integrationId: integration.id } });
    await integration.destroy();

    logger.info({ projectId }, 'GitHub integration disconnected');
    res.json({ message: 'GitHub integration disconnected' });
  } catch (error) {
    next(error);
  }
};
