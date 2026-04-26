import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Bug, GitHubRepo, GitHubIntegration } from '../db';
import config from '../config';
import logger from '../lib/logger';

// ─── Verify GitHub Webhook Signature ─────────────────────────────────
function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!config.github.webhookSecret) {
    // If no secret configured, skip verification (dev mode)
    logger.warn('GITHUB_WEBHOOK_SECRET not set — skipping webhook signature verification');
    return true;
  }

  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', config.github.webhookSecret)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Extract BugFixer ID from issue body ─────────────────────────────
function extractBugFixerId(body: string | null | undefined): string | null {
  if (!body) return null;
  // Matches: **BugFixer ID:** `<uuid>`
  const match = body.match(/\*\*BugFixer ID:\*\*\s*`([0-9a-f-]{36})`/i);
  return match ? match[1] : null;
}

// ─── Extract linked issue numbers from PR body ──────────────────────
function extractLinkedIssueNumbers(body: string | null | undefined): number[] {
  if (!body) return [];
  // Matches: Fixes #123, Closes #456, Resolves #789 (common GitHub keywords)
  const pattern = /(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?)\s+#(\d+)/gi;
  const numbers: number[] = [];
  let match;
  while ((match = pattern.exec(body)) !== null) {
    numbers.push(parseInt(match[1], 10));
  }
  return numbers;
}

// ─── GitHub Webhook Handler ──────────────────────────────────────────
// POST /api/github/webhook
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;

    // Verify webhook signature
    const rawBody = (req as any).rawBody;
    if (!verifySignature(rawBody || JSON.stringify(req.body), signature)) {
      logger.warn({ deliveryId }, 'Webhook signature verification failed');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    logger.info({ event, deliveryId }, `GitHub webhook received: ${event}`);

    // Handle pull_request events
    if (event === 'pull_request') {
      await handlePullRequestEvent(req.body);
    }

    // Acknowledge webhook immediately
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'Error processing GitHub webhook');
    next(error);
  }
};

// ─── Handle Pull Request Events ──────────────────────────────────────
async function handlePullRequestEvent(payload: any): Promise<void> {
  const action = payload.action; // opened, closed, merged, synchronize, etc.
  const pr = payload.pull_request;
  const repo = payload.repository;

  if (!pr || !repo) return;

  const repoFullName = repo.full_name; // "owner/repo"
  const prNumber = pr.number;
  const prUrl = pr.html_url;
  const prBranch = pr.head?.ref || null;
  const prBody = pr.body || '';
  const prMerged = pr.merged || false;

  logger.info(
    { action, prNumber, repoFullName, prBranch },
    `PR ${action}: #${prNumber} in ${repoFullName}`
  );

  // Strategy 1: Find bug by linked issue number in PR body (Fixes #N, Closes #N)
  const linkedIssueNumbers = extractLinkedIssueNumbers(prBody);

  for (const issueNumber of linkedIssueNumbers) {
    const bug = await Bug.findOne({
      where: {
        githubIssueNumber: issueNumber,
        githubRepoFullName: repoFullName,
      },
    });

    if (bug) {
      await updateBugFromPR(bug, action, prNumber, prUrl, prBranch, prMerged);
    }
  }

  // Strategy 2: Find bug by BugFixer ID embedded in PR body
  const bugFixerId = extractBugFixerId(prBody);
  if (bugFixerId) {
    const bug = await Bug.findByPk(bugFixerId);
    if (bug && bug.githubRepoFullName === repoFullName) {
      await updateBugFromPR(bug, action, prNumber, prUrl, prBranch, prMerged);
    }
  }

  // Strategy 3: Check if PR branch matches an issue referenced in the repo
  // Copilot often names branches like "copilot/fix-<issue-number>"
  if (prBranch) {
    const branchIssueMatch = prBranch.match(/(?:copilot\/fix-|bugfix\/)(\d+)/);
    if (branchIssueMatch) {
      const issueNumber = parseInt(branchIssueMatch[1], 10);
      const bug = await Bug.findOne({
        where: {
          githubIssueNumber: issueNumber,
          githubRepoFullName: repoFullName,
        },
      });
      if (bug) {
        await updateBugFromPR(bug, action, prNumber, prUrl, prBranch, prMerged);
      }
    }
  }
}

// ─── Update Bug from PR Event ────────────────────────────────────────
async function updateBugFromPR(
  bug: InstanceType<typeof Bug>,
  action: string,
  prNumber: number,
  prUrl: string,
  prBranch: string | null,
  prMerged: boolean
): Promise<void> {
  // Avoid double-processing if already updated for this PR
  if (bug.agentPrNumber === prNumber && bug.agentPrStatus === 'MERGED') {
    return;
  }

  switch (action) {
    case 'opened':
    case 'reopened':
      // PR was opened — move bug to CODE_REVIEW
      bug.agentPrNumber = prNumber;
      bug.agentPrUrl = prUrl;
      bug.agentPrBranch = prBranch;
      bug.agentPrStatus = 'PR_CREATED';

      // Auto-transition bug status to CODE_REVIEW if it's still in TRIAGE or IN_PROGRESS
      if (bug.status === 'TRIAGE' || bug.status === 'IN_PROGRESS') {
        bug.status = 'CODE_REVIEW';
      }

      logger.info(
        { bugId: bug.id, prNumber, prUrl },
        `Bug ${bug.id} moved to CODE_REVIEW — PR #${prNumber}`
      );
      break;

    case 'closed':
      if (prMerged) {
        // PR was merged — update agent status
        bug.agentPrStatus = 'MERGED';

        // Auto-transition to QA_TESTING if currently in CODE_REVIEW
        if (bug.status === 'CODE_REVIEW') {
          bug.status = 'QA_TESTING';
        }

        logger.info(
          { bugId: bug.id, prNumber },
          `Bug ${bug.id} PR #${prNumber} merged — moved to QA_TESTING`
        );
      } else {
        // PR closed without merge — mark as failed
        bug.agentPrStatus = 'FAILED';

        logger.info(
          { bugId: bug.id, prNumber },
          `Bug ${bug.id} PR #${prNumber} closed without merge`
        );
      }
      break;

    case 'synchronize':
      // PR was updated (new commits pushed) — keep status as PR_CREATED
      bug.agentPrStatus = 'PR_CREATED';
      break;

    default:
      return; // Ignore other actions
  }

  await bug.save();
}
