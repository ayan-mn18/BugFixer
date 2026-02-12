-- Migration: Create widget_tokens table
-- Run this SQL in your PostgreSQL database to create the widget_tokens table

-- Create the widget_tokens table
CREATE TABLE IF NOT EXISTS widget_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    allowed_origins TEXT[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_widget_tokens_token ON widget_tokens(token);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_project_id ON widget_tokens(project_id);
