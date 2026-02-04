import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user
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

export interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  name: string;
}
