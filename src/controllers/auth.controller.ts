import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../db';
import { SignupInput, LoginInput, UpdateProfileInput } from '../validators';
import { generateToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.middleware';

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

    // Generate token and set cookie
    const token = generateToken(user.id, user.email);
    setAuthCookie(res, token);

    res.status(201).json({
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
