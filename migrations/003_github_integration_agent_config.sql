-- Migration: Add GitHub integration, repos, agent config tables + bug GitHub/agent columns
-- Run against your PostgreSQL database

BEGIN;

-- ─── GitHub Integrations (one per project) ───────────────────────────
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  github_access_token TEXT NOT NULL,
  github_user_id VARCHAR(255) NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  connected_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── GitHub Repos (many per integration) ─────────────────────────────
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES github_integrations(id) ON DELETE CASCADE,
  repo_owner VARCHAR(255) NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  repo_full_name VARCHAR(512) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  auto_create_issues BOOLEAN NOT NULL DEFAULT TRUE,
  label_sync BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_repos_integration ON github_repos(integration_id);

-- ─── Agent Configs (one per project) ─────────────────────────────────
CREATE TYPE ai_provider_enum AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_provider ai_provider_enum NOT NULL DEFAULT 'OPENAI',
  ai_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  auto_assign BOOLEAN NOT NULL DEFAULT TRUE,
  target_branch VARCHAR(255) NOT NULL DEFAULT 'main',
  pr_branch_prefix VARCHAR(100) NOT NULL DEFAULT 'bugfix/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── New columns on bugs table ───────────────────────────────────────
CREATE TYPE agent_pr_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'PR_CREATED', 'MERGED', 'FAILED');

ALTER TABLE bugs
  ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
  ADD COLUMN IF NOT EXISTS github_issue_url VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS github_repo_full_name VARCHAR(512),
  ADD COLUMN IF NOT EXISTS agent_pr_branch VARCHAR(255),
  ADD COLUMN IF NOT EXISTS agent_pr_url VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS agent_pr_number INTEGER,
  ADD COLUMN IF NOT EXISTS agent_pr_status agent_pr_status_enum,
  ADD COLUMN IF NOT EXISTS agent_target_branch VARCHAR(255);

COMMIT;
