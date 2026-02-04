-- ============================================================================
-- BugFixer Database Schema Plan
-- PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- ENTITY RELATIONSHIP DIAGRAM (ASCII)
-- ============================================================================
/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUGFIXER DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │      users       │
    ├──────────────────┤
    │ id (PK)          │───────────────────────────────────┐
    │ email (UNIQUE)   │                                   │
    │ name             │                                   │
    │ password_hash    │                                   │
    │ avatar_url       │                                   │
    │ created_at       │                                   │
    │ updated_at       │                                   │
    └────────┬─────────┘                                   │
             │                                             │
             │ 1:N (owner)                                 │ 1:N (reporter)
             │                                             │
             ▼                                             │
    ┌──────────────────┐                                   │
    │     projects     │                                   │
    ├──────────────────┤                                   │
    │ id (PK)          │─────────────────┐                 │
    │ name             │                 │                 │
    │ description      │                 │                 │
    │ slug (UNIQUE)    │                 │                 │
    │ is_public        │                 │                 │
    │ owner_id (FK)────│─→ users.id      │                 │
    │ created_at       │                 │                 │
    │ updated_at       │                 │ 1:N             │
    └────────┬─────────┘                 │                 │
             │                           │                 │
             │                           ▼                 │
             │                  ┌──────────────────┐       │
             │                  │       bugs       │       │
             │                  ├──────────────────┤       │
             │                  │ id (PK)          │       │
             │                  │ title            │       │
             │                  │ description      │       │
             │                  │ priority (ENUM)  │       │
             │                  │ status (ENUM)    │       │
             │                  │ source (ENUM)    │       │
             │                  │ reporter_email   │       │
             │                  │ screenshots[]    │       │
             │                  │ project_id (FK)──│─→ projects.id
             │                  │ reporter_id (FK)─│───────┘
             │                  │ created_at       │
             │                  │ updated_at       │
             │                  └──────────────────┘
             │
             │ 1:N
             │
             ▼
    ┌────────────────────────┐          ┌────────────────────────┐
    │    project_members     │          │    access_requests     │
    ├────────────────────────┤          ├────────────────────────┤
    │ id (PK)                │          │ id (PK)                │
    │ project_id (FK)────────│─→        │ project_id (FK)────────│─→ projects.id
    │ user_id (FK)───────────│─→users   │ user_id (FK)───────────│─→ users.id
    │ role (ENUM)            │          │ status (ENUM)          │
    │ invited_by (FK)────────│─→users   │ message                │
    │ created_at             │          │ reviewed_by (FK)───────│─→ users.id
    │ updated_at             │          │ reviewed_at            │
    └────────────────────────┘          │ created_at             │
                                        │ updated_at             │
                                        └────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           ENUM TYPES                                     │
    ├─────────────────────────────────────────────────────────────────────────┤
    │                                                                          │
    │   priority_enum          status_enum              source_enum            │
    │   ┌─────────────┐        ┌─────────────┐          ┌──────────────────┐   │
    │   │ CRITICAL    │        │ TRIAGE      │          │ CUSTOMER_REPORT  │   │
    │   │ HIGH        │        │ IN_PROGRESS │          │ INTERNAL_QA      │   │
    │   │ MEDIUM      │        │ CODE_REVIEW │          │ AUTOMATED_TEST   │   │
    │   │ LOW         │        │ QA_TESTING  │          │ PRODUCTION_ALERT │   │
    │   └─────────────┘        │ DEPLOYED    │          └──────────────────┘   │
    │                          └─────────────┘                                 │
    │                                                                          │
    │   member_role_enum       request_status_enum                             │
    │   ┌─────────────┐        ┌─────────────┐                                 │
    │   │ VIEWER      │        │ PENDING     │                                 │
    │   │ CONTRIBUTOR │        │ APPROVED    │                                 │
    │   │ MAINTAINER  │        │ REJECTED    │                                 │
    │   └─────────────┘        └─────────────┘                                 │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────────┐
    │                         RELATIONSHIPS SUMMARY                            │
    ├─────────────────────────────────────────────────────────────────────────┤
    │                                                                          │
    │   users (1) ────────────────────────────────────────→ (N) projects       │
    │         └── One user can own many projects                               │
    │                                                                          │
    │   projects (1) ─────────────────────────────────────→ (N) bugs           │
    │         └── One project can have many bugs                               │
    │                                                                          │
    │   users (1) ────────────────────────────────────────→ (N) bugs           │
    │         └── One user can report many bugs (optional)                     │
    │                                                                          │
    │   users (N) ←───── project_members ─────→ (N) projects                   │
    │         └── Many-to-many: users can be members of many projects          │
    │                                                                          │
    │   users (N) ←───── access_requests ─────→ (N) projects                   │
    │         └── Many-to-many: users can request access to many projects      │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘

*/

-- ============================================================================
-- DROP EXISTING (for clean re-runs in development)
-- ============================================================================

DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS bugs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS request_status_enum CASCADE;
DROP TYPE IF EXISTS member_role_enum CASCADE;
DROP TYPE IF EXISTS priority_enum CASCADE;
DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS source_enum CASCADE;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Note: Using built-in gen_random_uuid() instead of uuid-ossp extension (not allowed in Azure PostgreSQL)

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Bug priority levels (severity of the issue)
CREATE TYPE priority_enum AS ENUM (
    'CRITICAL',    -- System down, data loss, security breach
    'HIGH',        -- Major feature broken, no workaround
    'MEDIUM',      -- Feature impaired, workaround exists
    'LOW'          -- Minor issue, cosmetic, nice-to-have fix
);

-- Bug lifecycle status (Kanban board columns)
CREATE TYPE status_enum AS ENUM (
    'TRIAGE',       -- New bug, needs review and prioritization
    'IN_PROGRESS',  -- Developer actively working on fix
    'CODE_REVIEW',  -- Fix submitted, awaiting peer review
    'QA_TESTING',   -- Code merged, being tested by QA
    'DEPLOYED'      -- Fix verified and released to production
);

-- Bug source (where the bug was discovered)
CREATE TYPE source_enum AS ENUM (
    'CUSTOMER_REPORT',   -- Reported by end user/customer
    'INTERNAL_QA',       -- Found during internal QA testing
    'AUTOMATED_TEST',    -- Caught by automated test suite
    'PRODUCTION_ALERT'   -- Detected via monitoring/alerting
);

-- Project member roles (permission levels)
CREATE TYPE member_role_enum AS ENUM (
    'VIEWER',       -- Can view bugs only
    'CONTRIBUTOR',  -- Can view and create/edit bugs
    'MAINTAINER'    -- Can view, create, edit, and move bugs (but not admin)
);

-- Access request status
CREATE TYPE request_status_enum AS ENUM (
    'PENDING',   -- Awaiting admin review
    'APPROVED',  -- Request approved, user added as member
    'REJECTED'   -- Request denied by admin
);

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Stores all registered users who can create projects and report bugs

CREATE TABLE users (
    -- Primary key: UUID for better distribution and non-guessable IDs
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,  -- bcrypt hash
    
    -- Profile information
    name            VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),           -- Optional profile picture URL
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for faster login lookups by email
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- TABLE: projects
-- ============================================================================
-- Projects are bug containers, owned by a single user (admin)

CREATE TABLE projects (
    -- Primary key
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Project details
    name            VARCHAR(100) NOT NULL,
    description     TEXT,                   -- Optional project description
    slug            VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly identifier
    is_public       BOOLEAN DEFAULT true NOT NULL, -- Can everyone see this project?
    
    -- Ownership (foreign key to users)
    owner_id        UUID NOT NULL,
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE  -- If user deleted, delete their projects
);

-- Index for faster lookups by owner
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- Index for slug lookups (commonly used in URLs)
CREATE INDEX idx_projects_slug ON projects(slug);

-- ============================================================================
-- TABLE: bugs
-- ============================================================================
-- Individual bug reports within a project

CREATE TABLE bugs (
    -- Primary key
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bug details
    title           VARCHAR(255) NOT NULL,
    description     TEXT,                   -- Rich text description
    priority        priority_enum DEFAULT 'MEDIUM' NOT NULL,
    status          status_enum DEFAULT 'TRIAGE' NOT NULL,
    source          source_enum DEFAULT 'INTERNAL_QA' NOT NULL,
    
    -- Reporter information
    reporter_email  VARCHAR(255),           -- For external bug reporters
    screenshots     TEXT[],                 -- Array of screenshot URLs
    
    -- Relationships (foreign keys)
    project_id      UUID NOT NULL,
    reporter_id     UUID,                   -- NULL if external reporter
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_bugs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,  -- If project deleted, delete its bugs
        
    CONSTRAINT fk_bugs_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(id)
        ON DELETE SET NULL  -- If reporter deleted, keep bug but remove reference
);

-- Index for fetching bugs by project (most common query)
CREATE INDEX idx_bugs_project_id ON bugs(project_id);

-- Index for fetching bugs by reporter
CREATE INDEX idx_bugs_reporter_id ON bugs(reporter_id);

-- Index for filtering by status (Kanban columns)
CREATE INDEX idx_bugs_status ON bugs(status);

-- Index for filtering by priority
CREATE INDEX idx_bugs_priority ON bugs(priority);

-- Composite index for common dashboard queries
CREATE INDEX idx_bugs_project_status ON bugs(project_id, status);

-- ============================================================================
-- TABLE: project_members
-- ============================================================================
-- Junction table for project access (many-to-many between users and projects)
-- Owner is NOT stored here - owner_id in projects table is the admin

CREATE TABLE project_members (
    -- Primary key
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship (composite unique to prevent duplicates)
    project_id      UUID NOT NULL,
    user_id         UUID NOT NULL,
    
    -- Member details
    role            member_role_enum DEFAULT 'VIEWER' NOT NULL,
    invited_by      UUID,                   -- Who added this member (NULL if from approved request)
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_project_members_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,  -- If project deleted, remove memberships
        
    CONSTRAINT fk_project_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,  -- If user deleted, remove their memberships
        
    CONSTRAINT fk_project_members_invited_by
        FOREIGN KEY (invited_by)
        REFERENCES users(id)
        ON DELETE SET NULL,  -- Keep membership even if inviter deleted
        
    -- Prevent duplicate memberships
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Index for fetching all members of a project
CREATE INDEX idx_project_members_project_id ON project_members(project_id);

-- Index for fetching all projects a user is member of
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- ============================================================================
-- TABLE: access_requests
-- ============================================================================
-- Stores pending/processed access requests from users wanting to join projects

CREATE TABLE access_requests (
    -- Primary key
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship
    project_id      UUID NOT NULL,
    user_id         UUID NOT NULL,          -- User requesting access
    
    -- Request details
    status          request_status_enum DEFAULT 'PENDING' NOT NULL,
    message         TEXT,                   -- Optional message from requester
    
    -- Review details (filled when admin acts on request)
    reviewed_by     UUID,                   -- Admin who approved/rejected
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    review_note     TEXT,                   -- Optional note from admin
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_access_requests_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,  -- If project deleted, remove requests
        
    CONSTRAINT fk_access_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,  -- If user deleted, remove their requests
        
    CONSTRAINT fk_access_requests_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,  -- Keep request history even if reviewer deleted
        
    -- Prevent duplicate pending requests (user can re-request after rejection)
    CONSTRAINT unique_pending_request UNIQUE (project_id, user_id, status)
);

-- Index for fetching all requests for a project (admin view)
CREATE INDEX idx_access_requests_project_id ON access_requests(project_id);

-- Index for fetching pending requests (most common admin query)
CREATE INDEX idx_access_requests_pending ON access_requests(project_id, status) 
    WHERE status = 'PENDING';

-- Index for fetching a user's requests
CREATE INDEX idx_access_requests_user_id ON access_requests(user_id);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to projects table
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to bugs table
CREATE TRIGGER trigger_bugs_updated_at
    BEFORE UPDATE ON bugs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to project_members table
CREATE TRIGGER trigger_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to access_requests table
CREATE TRIGGER trigger_access_requests_updated_at
    BEFORE UPDATE ON access_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample user
INSERT INTO users (id, email, password_hash, name, avatar_url) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'john@example.com',
    '$2b$10$dummyhashforsampledata1234567890', -- Not a real hash
    'John Developer',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
),
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'jane@example.com',
    '$2b$10$dummyhashforsampledata0987654321', -- Not a real hash
    'Jane Engineer',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=jane'
);

-- Insert sample project
INSERT INTO projects (id, name, description, slug, is_public, owner_id) VALUES
(
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'BugFixer App',
    'The bug tracking application itself - eating our own dog food!',
    'bugfixer-app',
    true,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
),
(
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Mobile App v2',
    'Next generation mobile application with new features',
    'mobile-app-v2',
    true,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
),
(
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'Internal Tools',
    'Private internal tooling - restricted access',
    'internal-tools',
    false,  -- Private project
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Insert sample bugs
INSERT INTO bugs (id, title, description, priority, status, source, reporter_email, screenshots, project_id, reporter_id) VALUES
(
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'Login button unresponsive on Safari',
    'Users on Safari 17+ report that the login button requires multiple clicks. Console shows no errors.',
    'HIGH',
    'IN_PROGRESS',
    'CUSTOMER_REPORT',
    'customer@external.com',
    ARRAY['https://screenshots.example.com/safari-bug-1.png'],
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    NULL
),
(
    'f6a7b8c9-d0e1-2345-f012-456789012345',
    'Dashboard charts not loading',
    'The analytics charts on the dashboard show infinite spinner. API returns 200 but data format changed.',
    'CRITICAL',
    'CODE_REVIEW',
    'INTERNAL_QA',
    NULL,
    ARRAY['https://screenshots.example.com/chart-bug-1.png', 'https://screenshots.example.com/chart-bug-2.png'],
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
),
(
    'a7b8c9d0-e1f2-3456-0123-567890123456',
    'Memory leak in notification service',
    'Production monitoring detected gradual memory increase over 72 hours. Heap dump shows notification listeners not being cleaned up.',
    'CRITICAL',
    'TRIAGE',
    'PRODUCTION_ALERT',
    NULL,
    ARRAY[],
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
),
(
    'b8c9d0e1-f2a3-4567-1234-678901234567',
    'Typo in error message',
    'Error message says "Somthing went wrong" instead of "Something went wrong"',
    'LOW',
    'DEPLOYED',
    'INTERNAL_QA',
    NULL,
    ARRAY[],
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
);

-- Insert sample project members (Jane is a contributor on BugFixer App)
INSERT INTO project_members (id, project_id, user_id, role, invited_by) VALUES
(
    'c9d0e1f2-a3b4-5678-9012-789012345678',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',  -- BugFixer App
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',  -- Jane
    'CONTRIBUTOR',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'   -- Invited by John (owner)
);

-- Insert sample access requests
INSERT INTO access_requests (id, project_id, user_id, status, message, reviewed_by, reviewed_at) VALUES
(
    'd0e1f2a3-b4c5-6789-0123-890123456789',
    'd4e5f6a7-b8c9-0123-def0-234567890123',  -- Mobile App v2
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',  -- Jane requesting
    'PENDING',
    'Hi! I would love to help with the mobile app bugs. I have experience with React Native.',
    NULL,
    NULL
);

-- ============================================================================
-- USEFUL QUERIES (for reference)
-- ============================================================================

/*
-- Get all bugs for a project with reporter info
SELECT 
    b.id,
    b.title,
    b.priority,
    b.status,
    b.source,
    b.created_at,
    COALESCE(u.name, b.reporter_email) AS reporter_name,
    COALESCE(u.email, b.reporter_email) AS reporter_contact
FROM bugs b
LEFT JOIN users u ON b.reporter_id = u.id
WHERE b.project_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
ORDER BY 
    CASE b.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
    END,
    b.created_at DESC;


-- Get bug counts by status for a project (Kanban column counts)
SELECT 
    status,
    COUNT(*) as count
FROM bugs
WHERE project_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'TRIAGE' THEN 1 
        WHEN 'IN_PROGRESS' THEN 2 
        WHEN 'CODE_REVIEW' THEN 3 
        WHEN 'QA_TESTING' THEN 4 
        WHEN 'DEPLOYED' THEN 5 
    END;


-- Get all projects for a user with bug counts
SELECT 
    p.id,
    p.name,
    p.slug,
    p.created_at,
    COUNT(b.id) AS total_bugs,
    COUNT(b.id) FILTER (WHERE b.status != 'DEPLOYED') AS open_bugs
FROM projects p
LEFT JOIN bugs b ON p.id = b.project_id
WHERE p.owner_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
GROUP BY p.id, p.name, p.slug, p.created_at
ORDER BY p.created_at DESC;


-- Get user's reported bugs across all projects
SELECT 
    b.id,
    b.title,
    b.status,
    b.priority,
    p.name AS project_name
FROM bugs b
JOIN projects p ON b.project_id = p.id
WHERE b.reporter_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
ORDER BY b.created_at DESC;

*/

-- ============================================================================
-- ACCESS CONTROL QUERIES (for reference)
-- ============================================================================

/*
-- Get all PUBLIC projects (for browse/explore page)
SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    u.name AS owner_name,
    COUNT(b.id) AS bug_count
FROM projects p
JOIN users u ON p.owner_id = u.id
LEFT JOIN bugs b ON p.id = b.project_id
WHERE p.is_public = true
GROUP BY p.id, p.name, p.slug, p.description, u.name
ORDER BY p.created_at DESC;


-- Get all projects a user has access to (owned + member)
SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    CASE 
        WHEN p.owner_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' THEN 'OWNER'
        ELSE pm.role::text
    END AS access_level,
    p.owner_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AS is_owner
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id 
    AND pm.user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
WHERE p.owner_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'  -- User is owner
   OR pm.user_id IS NOT NULL                                -- User is member
ORDER BY is_owner DESC, p.created_at DESC;


-- Get pending access requests for a project (admin view)
SELECT 
    ar.id,
    ar.message,
    ar.created_at,
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    u.avatar_url
FROM access_requests ar
JOIN users u ON ar.user_id = u.id
WHERE ar.project_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
  AND ar.status = 'PENDING'
ORDER BY ar.created_at ASC;


-- Get all members of a project (admin view)
SELECT 
    pm.id AS membership_id,
    pm.role,
    pm.created_at AS joined_at,
    u.id AS user_id,
    u.name,
    u.email,
    u.avatar_url,
    inv.name AS invited_by_name
FROM project_members pm
JOIN users u ON pm.user_id = u.id
LEFT JOIN users inv ON pm.invited_by = inv.id
WHERE pm.project_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
ORDER BY pm.created_at ASC;


-- Check if user can access a project (for authorization)
SELECT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
    AND (
        owner_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'  -- Is owner
        OR is_public = true                                 -- Is public
        OR EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
            AND user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
        )
    )
) AS has_access;


-- Get user's access requests status
SELECT 
    ar.id,
    ar.status,
    ar.message,
    ar.review_note,
    ar.created_at,
    ar.reviewed_at,
    p.name AS project_name,
    p.slug AS project_slug
FROM access_requests ar
JOIN projects p ON ar.project_id = p.id
WHERE ar.user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
ORDER BY ar.created_at DESC;

*/

-- ============================================================================
-- STATISTICS AFTER SAMPLE DATA
-- ============================================================================

-- Run these to verify data:
-- SELECT COUNT(*) AS user_count FROM users;
-- SELECT COUNT(*) AS project_count FROM projects;
-- SELECT COUNT(*) AS bug_count FROM bugs;
-- SELECT COUNT(*) AS member_count FROM project_members;
-- SELECT COUNT(*) AS request_count FROM access_requests;
-- SELECT status, COUNT(*) FROM bugs GROUP BY status;
-- SELECT status, COUNT(*) FROM access_requests GROUP BY status;
