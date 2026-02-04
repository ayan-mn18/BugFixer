import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../db';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
}

// Verify JWT token from cookie
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'name', 'avatarUrl'],
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(error);
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'email', 'name'],
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
};

// Generate JWT token
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
  } as jwt.SignOptions);
};

// Set auth cookie
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: config.jwt.cookieMaxAge,
    path: '/',
  });
};

// Clear auth cookie
export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};
