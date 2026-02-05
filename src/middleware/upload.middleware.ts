/**
 * File Upload Middleware
 * 
 * Handles multipart form data file uploads using multer.
 * Files are stored in memory buffer for upload to Azure Blob Storage.
 */

import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max number of files per upload
const MAX_FILES = 5;

/**
 * File filter to only allow images
 */
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

/**
 * Configure multer for memory storage
 * Files are stored in memory as Buffer objects
 */
const storage = multer.memoryStorage();

/**
 * Multer upload configuration
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

/**
 * Middleware for single file upload
 * Use: router.post('/upload', uploadSingle, controller)
 */
export const uploadSingle = upload.single('image');

/**
 * Middleware for multiple file upload (up to 5)
 * Use: router.post('/upload', uploadMultiple, controller)
 */
export const uploadMultiple = upload.array('images', MAX_FILES);

/**
 * Error handler for multer errors
 */
export const handleUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({ 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ 
          error: `Too many files. Maximum is ${MAX_FILES} files per upload` 
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({ 
          error: 'Unexpected field name in form data' 
        });
        return;
      default:
        res.status(400).json({ error: err.message });
        return;
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  
  // Pass other errors to default error handler
  next(err);
};

/**
 * Middleware to validate project ID is provided
 */
export const requireProjectId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const projectId = req.body.projectId || req.params.projectId;
  
  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }
  
  next();
};

export default upload;
