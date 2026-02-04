import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  avatarUrl: z.string().url('Invalid URL').optional().nullable(),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

// Bug schemas
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const statusEnum = z.enum(['TRIAGE', 'IN_PROGRESS', 'CODE_REVIEW', 'QA_TESTING', 'DEPLOYED']);
export const sourceEnum = z.enum(['CUSTOMER_REPORT', 'INTERNAL_QA', 'AUTOMATED_TEST', 'PRODUCTION_ALERT']);

export const createBugSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(500),
  description: z.string().max(5000).optional(),
  priority: priorityEnum.default('MEDIUM'),
  projectId: z.string().uuid(),
  source: sourceEnum.default('INTERNAL_QA'),
  reporterEmail: z.string().email().optional().nullable(),
  screenshots: z.array(z.string().url()).optional().nullable(),
});

export const updateBugSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: priorityEnum.optional(),
  source: sourceEnum.optional(),
  reporterEmail: z.string().email().optional().nullable(),
  screenshots: z.array(z.string().url()).optional().nullable(),
});

export const updateBugStatusSchema = z.object({
  status: statusEnum,
});

// Member schemas
export const memberRoleEnum = z.enum(['VIEWER', 'MEMBER', 'ADMIN']);

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: memberRoleEnum.default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: memberRoleEnum,
});

// Access request schemas
export const createAccessRequestSchema = z.object({
  message: z.string().max(500).optional(),
});

export const reviewAccessRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  role: memberRoleEnum.optional(), // Only used if approved
});

// Type exports
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateBugInput = z.infer<typeof createBugSchema>;
export type UpdateBugInput = z.infer<typeof updateBugSchema>;
export type UpdateBugStatusInput = z.infer<typeof updateBugStatusSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
export type ReviewAccessRequestInput = z.infer<typeof reviewAccessRequestSchema>;
