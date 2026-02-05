/**
 * Upload Controller
 * 
 * Handles image upload endpoints for bug screenshots.
 */

import { Request, Response, NextFunction } from 'express';
import { 
  uploadImage, 
  uploadImages, 
  deleteImage,
  isAzureStorageConfigured,
  getConfigStatus 
} from '../services/azure-storage.service';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Upload a single image
 * POST /api/upload/image
 * Body: multipart/form-data with 'image' file and 'projectId'
 */
export const uploadSingleImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if Azure Storage is configured
    if (!isAzureStorageConfigured()) {
      const status = getConfigStatus();
      res.status(503).json({ 
        error: 'Image upload service is not configured',
        details: status.details
      });
      return;
    }

    const file = req.file as UploadedFile | undefined;
    const { projectId, bugId } = req.body;

    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    const result = await uploadImage(file, projectId, bugId || null);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        url: result.url,
        originalName: result.originalName,
        size: result.size,
        contentType: result.contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid file type') || error.message.includes('File too large')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

/**
 * Upload multiple images (up to 5)
 * POST /api/upload/images
 * Body: multipart/form-data with 'images' files and 'projectId'
 */
export const uploadMultipleImages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if Azure Storage is configured
    if (!isAzureStorageConfigured()) {
      const status = getConfigStatus();
      res.status(503).json({ 
        error: 'Image upload service is not configured',
        details: status.details
      });
      return;
    }

    const files = req.files as UploadedFile[] | undefined;
    const { projectId, bugId } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No image files provided' });
      return;
    }

    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    const results = await uploadImages(files, projectId, bugId || null);

    res.status(201).json({
      message: `${results.length} image(s) uploaded successfully`,
      images: results.map((result) => ({
        url: result.url,
        originalName: result.originalName,
        size: result.size,
        contentType: result.contentType,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid file type') || error.message.includes('File too large')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

/**
 * Delete an image
 * DELETE /api/upload/image
 * Body: { url: string }
 */
export const deleteSingleImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'Image URL is required' });
      return;
    }

    await deleteImage(url);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Check upload service status
 * GET /api/upload/status
 */
export const getUploadStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = getConfigStatus();
    
    res.json({
      configured: status.configured,
      details: status.details,
      limits: {
        maxFileSize: '10MB',
        maxFiles: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      },
    });
  } catch (error) {
    next(error);
  }
};
