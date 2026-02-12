import { Octokit } from '@octokit/rest';
import config from '../config';
import { encrypt, decrypt } from './crypto.service';
import logger from '../lib/logger';

// ─── OAuth Token Exchange ────────────────────────────────────────────
export const exchangeCodeForToken = async (
  code: string
): Promise<{ accessToken: string; tokenType: string }> => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange code for token');
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
  };
};

// ─── Helper: get authenticated Octokit ───────────────────────────────
export const getOctokit = (encryptedToken: string): Octokit => {
  const token = decrypt(encryptedToken);
  return new Octokit({ auth: token });
};

// ─── Fetch GitHub User Info ──────────────────────────────────────────
export const getGitHubUser = async (
  accessToken: string
): Promise<{ id: number; login: string }> => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.users.getAuthenticated();
  return { id: data.id, login: data.login };
};

// ─── List Repos for Authenticated User ───────────────────────────────
export const getUserRepos = async (
  encryptedToken: string,
  page = 1,
  perPage = 30
): Promise<{
  repos: Array<{
    id: number;
    name: string;
    fullName: string;
    owner: string;
    private: boolean;
    defaultBranch: string;
    description: string | null;
  }>;
  hasMore: boolean;
}> => {
  const octokit = getOctokit(encryptedToken);

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    direction: 'desc',
    per_page: perPage,
    page,
    type: 'all',
  });

  return {
    repos: data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login || '',
      private: r.private,
      defaultBranch: r.default_branch,
      description: r.description,
    })),
    hasMore: data.length === perPage,
  };
};

// ─── Create GitHub Issue ─────────────────────────────────────────────
interface CreateIssueParams {
  encryptedToken: string;
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

export const createGitHubIssue = async (
  params: CreateIssueParams
): Promise<{ number: number; url: string }> => {
  const octokit = getOctokit(params.encryptedToken);

  try {
    const { data } = await octokit.issues.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body || '',
      labels: params.labels || [],
    });

    return { number: data.number, url: data.html_url };
  } catch (error) {
    logger.error({ err: error, owner: params.owner, repo: params.repo }, 'Failed to create GitHub issue');
    throw error;
  }
};

// ─── Sync BugFixer labels to GitHub ──────────────────────────────────
const BUGFIXER_LABELS = [
  { name: 'bugfixer:critical', color: 'B60205', description: 'Critical priority - BugFixer' },
  { name: 'bugfixer:high', color: 'D93F0B', description: 'High priority - BugFixer' },
  { name: 'bugfixer:medium', color: 'FBCA04', description: 'Medium priority - BugFixer' },
  { name: 'bugfixer:low', color: '0E8A16', description: 'Low priority - BugFixer' },
  { name: 'bugfixer', color: '6f42c1', description: 'Synced from BugFixer' },
];

export const syncLabels = async (
  encryptedToken: string,
  owner: string,
  repo: string
): Promise<void> => {
  const octokit = getOctokit(encryptedToken);

  for (const label of BUGFIXER_LABELS) {
    try {
      await octokit.issues.createLabel({
        owner,
        repo,
        name: label.name,
        color: label.color,
        description: label.description,
      });
    } catch (error: any) {
      // Label already exists — update it
      if (error.status === 422) {
        try {
          await octokit.issues.updateLabel({
            owner,
            repo,
            name: label.name,
            color: label.color,
            description: label.description,
          });
        } catch {
          // Ignore update failures
        }
      }
    }
  }
};

// ─── Get PR Status ───────────────────────────────────────────────────
export const getPRStatus = async (
  encryptedToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ state: string; merged: boolean; url: string }> => {
  const octokit = getOctokit(encryptedToken);
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  return { state: data.state, merged: data.merged, url: data.html_url };
};

// ─── Build OAuth Authorization URL ──────────────────────────────────
export const buildOAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.callbackUrl,
    scope: 'repo',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};
