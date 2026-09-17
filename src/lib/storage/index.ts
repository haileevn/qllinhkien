import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface UploadResult {
  url: string;
  path: string;
}

export interface StorageProvider {
  uploadFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<UploadResult>;
  deleteFile(filePath: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      // ignore if exists
    }
  }

  async uploadFile(buffer: Buffer, originalFilename: string, _mimeType: string): Promise<UploadResult> {
    await this.ensureDir();
    const ext = path.extname(originalFilename) || '.jpg';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext.toLowerCase()}`;
    const targetPath = path.join(this.uploadDir, uniqueName);

    await fs.writeFile(targetPath, buffer);
    return {
      url: `/uploads/${uniqueName}`,
      path: uniqueName,
    };
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const filename = path.basename(filePath);
      const fullPath = path.join(this.uploadDir, filename);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton factory
let currentProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!currentProvider) {
    currentProvider = new LocalStorageProvider();
  }
  return currentProvider;
}
