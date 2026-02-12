import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Project, Bug, User, ProjectMember, WidgetToken } from '../db';
import { CreateWidgetBugInput, UpdateWidgetSettingsInput } from '../validators';
import config from '../config';
import logger from '../lib/logger';

// ============================================================================
// WIDGET SETTINGS (Authenticated - Owner/Admin only)
// ============================================================================

// Get widget settings for a project
export const getWidgetSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ where: { slug } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check owner/admin access
    const isOwner = userId === project.ownerId;
    let isAdmin = false;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only owners and admins can manage widget settings' });
      return;
    }

    const widgetToken = await WidgetToken.findOne({
      where: { projectId: project.id },
    });

    res.json({
      widget: widgetToken
        ? {
            id: widgetToken.id,
            token: widgetToken.token,
            allowedOrigins: widgetToken.allowedOrigins,
            enabled: widgetToken.enabled,
            embedSnippet: generateEmbedSnippet(widgetToken.token),
            createdAt: widgetToken.createdAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// Generate or regenerate widget token
export const generateWidgetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ where: { slug } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check owner/admin access
    const isOwner = userId === project.ownerId;
    let isAdmin = false;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only owners and admins can manage widget settings' });
      return;
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Upsert widget token (one per project)
    let widgetToken = await WidgetToken.findOne({
      where: { projectId: project.id },
    });

    if (widgetToken) {
      widgetToken.token = token;
      await widgetToken.save();
    } else {
      widgetToken = await WidgetToken.create({
        projectId: project.id,
        token,
        allowedOrigins: [],
        enabled: true,
      });
    }

    res.json({
      widget: {
        id: widgetToken.id,
        token: widgetToken.token,
        allowedOrigins: widgetToken.allowedOrigins,
        enabled: widgetToken.enabled,
        embedSnippet: generateEmbedSnippet(widgetToken.token),
        createdAt: widgetToken.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update widget settings (allowed origins, enabled)
export const updateWidgetSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;
    const { allowedOrigins, enabled } = req.body as UpdateWidgetSettingsInput;

    const project = await Project.findOne({ where: { slug } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check owner/admin access
    const isOwner = userId === project.ownerId;
    let isAdmin = false;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only owners and admins can manage widget settings' });
      return;
    }

    const widgetToken = await WidgetToken.findOne({
      where: { projectId: project.id },
    });

    if (!widgetToken) {
      res.status(404).json({ error: 'Widget not configured. Generate a token first.' });
      return;
    }

    if (allowedOrigins !== undefined) widgetToken.allowedOrigins = allowedOrigins;
    if (enabled !== undefined) widgetToken.enabled = enabled;
    await widgetToken.save();

    res.json({
      widget: {
        id: widgetToken.id,
        token: widgetToken.token,
        allowedOrigins: widgetToken.allowedOrigins,
        enabled: widgetToken.enabled,
        embedSnippet: generateEmbedSnippet(widgetToken.token),
        createdAt: widgetToken.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete widget token
export const deleteWidgetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ where: { slug } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check owner/admin access
    const isOwner = userId === project.ownerId;
    let isAdmin = false;
    if (!isOwner) {
      const membership = await ProjectMember.findOne({
        where: { projectId: project.id, userId },
      });
      isAdmin = membership?.role === 'ADMIN';
    }

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Only owners and admins can manage widget settings' });
      return;
    }

    await WidgetToken.destroy({ where: { projectId: project.id } });

    res.json({ message: 'Widget token deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// WIDGET PUBLIC ENDPOINTS (Token-based auth, no JWT)
// ============================================================================

// Get widget configuration (public - used by iframe)
export const getWidgetConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const widgetToken = await WidgetToken.findOne({
      where: { token },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'slug', 'description'],
        },
      ],
    });

    if (!widgetToken) {
      res.status(404).json({ error: 'Invalid widget token' });
      return;
    }

    if (!widgetToken.enabled) {
      res.status(403).json({ error: 'Widget is disabled for this project' });
      return;
    }

    // Optionally validate origin
    const origin = req.get('Origin') || req.get('Referer');
    if (widgetToken.allowedOrigins.length > 0 && origin) {
      const originHost = new URL(origin).origin;
      if (!widgetToken.allowedOrigins.includes(originHost) && !widgetToken.allowedOrigins.includes('*')) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
      }
    }

    const project = (widgetToken as any).project;

    res.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create bug via widget (public - token-based auth)
export const createWidgetBug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const { title, description, priority, source, reporterEmail, screenshots } = req.body as CreateWidgetBugInput;

    const widgetToken = await WidgetToken.findOne({
      where: { token },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!widgetToken) {
      res.status(404).json({ error: 'Invalid widget token' });
      return;
    }

    if (!widgetToken.enabled) {
      res.status(403).json({ error: 'Widget is disabled for this project' });
      return;
    }

    // Validate origin if origins are configured
    const origin = req.get('Origin') || req.get('Referer');
    if (widgetToken.allowedOrigins.length > 0 && origin) {
      const originHost = new URL(origin).origin;
      if (!widgetToken.allowedOrigins.includes(originHost) && !widgetToken.allowedOrigins.includes('*')) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
      }
    }

    const project = (widgetToken as any).project;

    const bug = await Bug.create({
      title,
      description: description || null,
      priority: priority || 'MEDIUM',
      projectId: project.id,
      reporterId: null, // Widget bugs don't have a logged-in user
      source: source || 'CUSTOMER_REPORT',
      reporterEmail: reporterEmail || null,
      screenshots: screenshots || null,
      status: 'TRIAGE',
    });

    logger.info(
      { bugId: bug.id, projectId: project.id, widget: true },
      `Widget bug created: ${bug.title}`
    );

    res.status(201).json({
      bug: {
        id: bug.id,
        title: bug.title,
        priority: bug.priority,
        status: bug.status,
      },
      message: 'Bug reported successfully!',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EMBED SCRIPT ENDPOINT
// ============================================================================

// Serve the embed.js script
export const serveEmbedScript = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    res.status(400).type('application/javascript').send('console.error("BugFixer Widget: Missing token parameter");');
    return;
  }

  const frontendUrl = config.frontendUrl.split(',')[0].trim();

  const script = `
(function() {
  if (window.__bugfixer_widget_loaded) return;
  window.__bugfixer_widget_loaded = true;

  var token = "${token}";
  var baseUrl = "${frontendUrl}";
  var iframeUrl = baseUrl + "/widget/" + token;

  // Create floating button
  var btn = document.createElement("button");
  btn.id = "bugfixer-widget-btn";
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>';
  btn.setAttribute("aria-label", "Report a Bug");
  btn.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:2147483647;width:56px;height:56px;border-radius:50%;background:#18181b;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s,box-shadow 0.2s;";

  btn.onmouseenter = function() { btn.style.transform = "scale(1.1)"; btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)"; };
  btn.onmouseleave = function() { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; };

  // Create iframe container
  var container = document.createElement("div");
  container.id = "bugfixer-widget-container";
  container.style.cssText = "position:fixed;bottom:96px;right:24px;z-index:2147483647;width:420px;max-width:calc(100vw - 48px);height:560px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.25);display:none;transition:opacity 0.2s,transform 0.2s;opacity:0;transform:translateY(10px);";

  var iframe = document.createElement("iframe");
  iframe.src = iframeUrl;
  iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:16px;";
  iframe.setAttribute("allow", "clipboard-write");
  container.appendChild(iframe);

  document.body.appendChild(btn);
  document.body.appendChild(container);

  var isOpen = false;

  btn.onclick = function() {
    isOpen = !isOpen;
    if (isOpen) {
      container.style.display = "block";
      setTimeout(function() { container.style.opacity = "1"; container.style.transform = "translateY(0)"; }, 10);
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    } else {
      container.style.opacity = "0";
      container.style.transform = "translateY(10px)";
      setTimeout(function() { container.style.display = "none"; }, 200);
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>';
    }
  };

  // Listen for messages from the iframe
  window.addEventListener("message", function(event) {
    if (event.origin !== baseUrl) return;
    
    if (event.data.type === "bugfixer:close") {
      isOpen = false;
      container.style.opacity = "0";
      container.style.transform = "translateY(10px)";
      setTimeout(function() { container.style.display = "none"; }, 200);
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>';
    }

    if (event.data.type === "bugfixer:success") {
      // Optional: show a success toast on the host page
    }
  });
})();
`.trim();

  res.type('application/javascript').send(script);
};

// ============================================================================
// HELPERS
// ============================================================================

function generateEmbedSnippet(token: string): string {
  const frontendUrl = config.frontendUrl.split(',')[0].trim();
  const apiUrl = frontendUrl.replace(/:\d+$/, ':7070'); // Fallback for dev
  const baseUrl = process.env.API_PUBLIC_URL || `${apiUrl.replace(/\/+$/, '')}`;
  return `<script src="${baseUrl}/api/widget/embed.js?token=${token}"></script>`;
}
