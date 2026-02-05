/**
 * Upload Routes
 * 
 * Endpoints for image upload to Azure Blob Storage.
 */

import { Router } from 'express';
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteSingleImage,
  getUploadStatus,
} from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError 
} from '../middleware/upload.middleware';

const router = Router();

// GET /api/upload/status - Check upload service status
router.get('/status', getUploadStatus);

// POST /api/upload/image - Upload a single image
// Body: multipart/form-data with 'image' file and 'projectId'
router.post(
  '/image',
  authenticate,
  uploadSingle,
  handleUploadError,
  uploadSingleImage
);

// POST /api/upload/images - Upload multiple images (up to 5)
// Body: multipart/form-data with 'images' files and 'projectId'
router.post(
  '/images',
  authenticate,
  uploadMultiple,
  handleUploadError,
  uploadMultipleImages
);

// DELETE /api/upload/image - Delete an image
// Body: { url: string }
router.delete('/image', authenticate, deleteSingleImage);

export default router;
