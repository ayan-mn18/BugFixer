import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema, ZodIssue } from 'zod';

// Validation middleware factory
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
      next(error);
    }
  };
};

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('❌ Error:', err);

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not found' });
};

// Request logger
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
