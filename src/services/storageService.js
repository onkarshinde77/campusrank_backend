// server/src/services/storageService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Storage Implementation
export const localStorageService = {
  async upload(userId, file) {
    try {
      const uploadDir = path.join(__dirname, '../../uploads', userId);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}-${file.originalname || 'profile.jpg'}`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, file.buffer || file.data);

      return {
        success: true,
        url: `/uploads/${userId}/${filename}`,
        path: filepath,
        filename
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw error;
    }
  },

  async download(userId, filename) {
    try {
      const filepath = path.join(__dirname, '../../uploads', userId, filename);

      if (!fs.existsSync(filepath)) {
        throw new Error('File not found');
      }

      return fs.readFileSync(filepath);
    } catch (error) {
      console.error('Local storage download error:', error);
      throw error;
    }
  },

  async delete(userId, filename) {
    try {
      const filepath = path.join(__dirname, '../../uploads', userId, filename);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true };
      }

      return { success: false, message: 'File not found' };
    } catch (error) {
      console.error('Local storage delete error:', error);
      throw error;
    }
  },

  async exists(userId, filename) {
    const filepath = path.join(__dirname, '../../uploads', userId, filename);
    return fs.existsSync(filepath);
  }
};

// S3 Storage Implementation (Placeholder for AWS migration)
export const s3StorageService = {
  async upload(userId, file) {
    // TODO: Implement AWS S3 upload
    console.warn('S3 upload not yet configured');
    throw new Error('S3 storage not configured');
  },

  async download(userId, filename) {
    // TODO: Implement AWS S3 download
    throw new Error('S3 storage not configured');
  },

  async delete(userId, filename) {
    // TODO: Implement AWS S3 delete
    throw new Error('S3 storage not configured');
  },

  async exists(userId, filename) {
    // TODO: Implement AWS S3 exists check
    return false;
  }
};

// Storage factory
export const getStorageService = (type = 'local') => {
  if (type === 's3') {
    return s3StorageService;
  }
  return localStorageService;
};

// Generic storage service using selected provider
class StorageService {
  constructor(provider = 'local') {
    this.provider = getStorageService(provider);
  }

  async upload(userId, file) {
    return this.provider.upload(userId, file);
  }

  async download(userId, filename) {
    return this.provider.download(userId, filename);
  }

  async delete(userId, filename) {
    return this.provider.delete(userId, filename);
  }

  async exists(userId, filename) {
    return this.provider.exists(userId, filename);
  }

  // Profile picture specific methods
  async uploadProfilePicture(userId, base64String) {
    try {
      if (!base64String.includes(',')) {
        throw new Error('Invalid base64 format');
      }

      const [header, data] = base64String.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      // Convert to buffer
      const buffer = Buffer.from(data, 'base64');

      const file = {
        buffer,
        originalname: `profile-${Date.now()}.jpg`
      };

      return this.upload(userId, file);
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw error;
    }
  }

  async deleteProfilePicture(userId, filename) {
    return this.delete(userId, filename);
  }

  async getProfilePictureUrl(userId, filename) {
    const exists = await this.exists(userId, filename);
    if (!exists) return null;

    // For local storage
    if (this.provider === localStorageService) {
      return `/uploads/${userId}/${filename}`;
    }

    // For S3 or other cloud storage
    // Return signed URL
    return null;
  }
}

export default new StorageService(process.env.STORAGE_TYPE || 'local');
