import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, Invitation, ProjectMember } from '../db';
import { SignupInput, LoginInput, UpdateProfileInput } from '../validators';
import { generateToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.middleware';
import { sendWelcomeEmail, sendLoginNotificationEmail } from '../services/email.service';
import logger from '../lib/logger';

// Helper function to process pending invitations for a user
const processPendingInvitations = async (userId: string, email: string): Promise<number> => {
  try {
    // Find all pending invitations for this email
    const pendingInvitations = await Invitation.findAll({
      where: {
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    let processedCount = 0;

    for (const invitation of pendingInvitations) {
      // Check if user is already a member
      const existingMember = await ProjectMember.findOne({
        where: {
          projectId: invitation.projectId,
          userId: userId
        }
      });

      if (!existingMember) {
        // Add user as project member
        await ProjectMember.create({
          projectId: invitation.projectId,
          userId: userId,
          role: invitation.role
        });
        processedCount++;
      }

      // Mark invitation as accepted
      await invitation.update({ status: 'ACCEPTED' });
    }

    return processedCount;
  } catch (error) {
    logger.error({ err: error }, 'Error processing pending invitations');
    return 0;
  }
};

// Sign up
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body as SignupInput;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      name,
    });

    // Process any pending invitations for this email
    const invitationsProcessed = await processPendingInvitations(user.id, email);
    logger.info({ email, invitationsProcessed }, `Processed ${invitationsProcessed} pending invitations`);

    // Generate token and set cookie
    const token = generateToken(user.id, user.email);
    setAuthCookie(res, token);

    // Send welcome email (don't await to avoid slowing down signup)
    sendWelcomeEmail(user.email, user.name || 'there').catch((err) => logger.error({ err }, 'Failed to send welcome email'));

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      invitationsProcessed, // Let frontend know how many invites were auto-accepted
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token and set cookie
    const token = generateToken(user.id, user.email);
    setAuthCookie(res, token);

    // Send login notification email (don't await to avoid slowing down login)
    const userAgent = req.headers['user-agent'] || 'Unknown device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';
    sendLoginNotificationEmail(user.email, user.name || 'there', userAgent, ipAddress).catch((err) => logger.error({ err }, 'Failed to send login notification email'));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
};

// Get current user
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'avatarUrl', 'createdAt'],
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Update profile
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body as UpdateProfileInput;

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
