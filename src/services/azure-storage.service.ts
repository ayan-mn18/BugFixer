/**
 * Azure Blob Storage Service
 * 
 * Handles all image upload operations to Azure Blob Storage.
 * 
 * Naming Convention:
 * - Container: bug-screenshots
 * - Blob path: {projectId}/{bugId}/{timestamp}_{originalName}
 * - Example: f02fddb8-3db0-40e4-8da2-1cc8f025be6f/bug123/1738756800000_screenshot.png
 * 
 * This convention allows:
 * - Easy grouping by project
 * - Easy grouping by bug
 * - Unique names with timestamp
 * - Preserves original filename for context
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

// Configuration - to be set in .env
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER_NAME = 'bug-screenshots';

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

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface UploadResult {
  url: string;
  blobName: string;
  originalName: string;
  size: number;
  contentType: string;
}

/**
 * Get the blob service client
 */
function getBlobServiceClient(): BlobServiceClient {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }
  
  if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY) {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );
    return new BlobServiceClient(
      `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }
  
  throw new Error('Azure Storage credentials not configured. Please set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
}

/**
 * Get or create the container for bug screenshots
 */
async function getContainer(): Promise<ContainerClient> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  // Create container if it doesn't exist (private - no public access)
  await containerClient.createIfNotExists();
  
  return containerClient;
}

/**
 * Generate a unique blob name with proper structure
 * Format: {projectId}/{bugId}/{timestamp}_{sanitizedOriginalName}
 */
function generateBlobName(projectId: string, bugId: string | null, originalName: string): string {
  const timestamp = Date.now();
  // Sanitize the original name (remove special chars, replace spaces)
  const sanitizedName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  
  if (bugId) {
    return `${projectId}/${bugId}/${timestamp}_${sanitizedName}`;
  }
  
  // For new bugs (not yet created), use 'pending' folder
  return `${projectId}/pending/${timestamp}_${sanitizedName}`;
}

/**
 * Validate a file before upload
 */
function validateFile(file: UploadedFile): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Upload a single image to Azure Blob Storage
 */
export async function uploadImage(
  file: UploadedFile,
  projectId: string,
  bugId: string | null = null
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const containerClient = await getContainer();
  const blobName = generateBlobName(projectId, bugId, file.originalname);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  // Upload the file
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
      blobCacheControl: 'max-age=31536000', // Cache for 1 year
    },
    metadata: {
      projectId,
      bugId: bugId || 'pending',
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  // Generate a long-lived SAS URL (1 year) for private container access
  const sasUrl = generateSasUrl(blockBlobClient.url, 60 * 24 * 365); // 1 year
  
  return {
    url: sasUrl,
    blobName,
    originalName: file.originalname,
    size: file.size,
    contentType: file.mimetype,
  };
}

/**
 * Upload multiple images at once
 */
export async function uploadImages(
  files: UploadedFile[],
  projectId: string,
  bugId: string | null = null
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadImage(file, projectId, bugId))
  );
  return results;
}

/**
 * Delete an image from Azure Blob Storage
 */
export async function deleteImage(blobUrl: string): Promise<void> {
  try {
    const containerClient = await getContainer();
    
    // Strip SAS token if present to get blob name
    const urlWithoutSas = blobUrl.split('?')[0];
    const url = new URL(urlWithoutSas);
    const blobName = url.pathname.replace(`/${CONTAINER_NAME}/`, '');
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - deletion failure shouldn't break the app
  }
}

/**
 * Delete multiple images
 */
export async function deleteImages(blobUrls: string[]): Promise<void> {
  await Promise.all(blobUrls.map((url) => deleteImage(url)));
}

/**
 * Move images from pending to bug folder
 * Called when a bug is created with pending images
 */
export async function movePendingImages(
  imageUrls: string[],
  projectId: string,
  bugId: string
): Promise<string[]> {
  const containerClient = await getContainer();
  const newUrls: string[] = [];
  
  for (const oldUrl of imageUrls) {
    try {
      // Strip SAS token if present to get blob name
      const urlWithoutSas = oldUrl.split('?')[0];
      const url = new URL(urlWithoutSas);
      const oldBlobName = url.pathname.replace(`/${CONTAINER_NAME}/`, '');
      
      // Check if this is a pending image
      if (!oldBlobName.includes('/pending/')) {
        newUrls.push(oldUrl); // Keep the URL as is
        continue;
      }
      
      // Generate new blob name
      const filename = oldBlobName.split('/').pop() || 'image';
      const newBlobName = `${projectId}/${bugId}/${filename}`;
      
      // Copy to new location
      const oldBlobClient = containerClient.getBlockBlobClient(oldBlobName);
      const newBlobClient = containerClient.getBlockBlobClient(newBlobName);
      
      // Need SAS URL for copy source since container is private
      const oldSasUrl = generateSasUrl(oldBlobClient.url, 60); // 1 hour for copy
      await newBlobClient.beginCopyFromURL(oldSasUrl);
      
      // Delete old blob
      await oldBlobClient.deleteIfExists();
      
      // Return new SAS URL
      const newSasUrl = generateSasUrl(newBlobClient.url, 60 * 24 * 365); // 1 year
      newUrls.push(newSasUrl);
    } catch (error) {
      console.error('Error moving image:', error);
      newUrls.push(oldUrl); // Keep old URL if move fails
    }
  }
  
  return newUrls;
}

/**
 * Generate a SAS URL for temporary access (if container is private)
 */
export function generateSasUrl(blobUrl: string, expiryMinutes: number = 60): string {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_ACCOUNT_KEY) {
    return blobUrl; // Return original URL if we can't generate SAS
  }
  
  try {
    const url = new URL(blobUrl);
    const blobName = url.pathname.replace(`/${CONTAINER_NAME}/`, '');
    
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );
    
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);
    
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse('r'), // Read only
        expiresOn,
      },
      sharedKeyCredential
    ).toString();
    
    return `${blobUrl}?${sasToken}`;
  } catch {
    return blobUrl;
  }
}

/**
 * Check if Azure Storage is configured
 */
export function isAzureStorageConfigured(): boolean {
  return !!(AZURE_STORAGE_CONNECTION_STRING || (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY));
}

/**
 * Get configuration status for debugging
 */
export function getConfigStatus(): { configured: boolean; details: string } {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    return { configured: true, details: 'Using connection string' };
  }
  if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY) {
    return { configured: true, details: `Using account: ${AZURE_STORAGE_ACCOUNT_NAME}` };
  }
  return { configured: false, details: 'No credentials configured' };
}
