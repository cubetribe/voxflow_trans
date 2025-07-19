import fs from 'fs/promises';
import path from 'path';
import tmp from 'tmp';
import { logger } from '@/utils/logger';

export class CleanupService {
  private cleanupTasks: Map<string, NodeJS.Timeout> = new Map();
  private protectedFiles: Set<string> = new Set();

  constructor() {
    // Clean up tmp files on process exit
    process.on('exit', () => {
      this.cleanupAll();
    });

    process.on('SIGINT', () => {
      this.cleanupAll();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanupAll();
      process.exit(0);
    });
  }

  /**
   * Schedule cleanup of a file or directory after a delay
   */
  scheduleCleanup(filePath: string, delayMs: number = 300000): void { // 5 minutes default
    // Cancel existing cleanup for this file
    if (this.cleanupTasks.has(filePath)) {
      clearTimeout(this.cleanupTasks.get(filePath)!);
    }

    const timeout = setTimeout(async () => {
      try {
        if (!this.protectedFiles.has(filePath)) {
          await this.cleanupPath(filePath);
        }
      } catch (error) {
        logger.error(`Failed to cleanup ${filePath}:`, error);
      } finally {
        this.cleanupTasks.delete(filePath);
      }
    }, delayMs);

    this.cleanupTasks.set(filePath, timeout);
    logger.debug(`Scheduled cleanup for ${filePath} in ${delayMs}ms`);
  }

  /**
   * Protect a file from automatic cleanup
   */
  protectFile(filePath: string): void {
    this.protectedFiles.add(filePath);
  }

  /**
   * Unprotect a file, allowing cleanup
   */
  unprotectFile(filePath: string): void {
    this.protectedFiles.delete(filePath);
  }

  /**
   * Immediately clean up a file or directory
   */
  async cleanupPath(targetPath: string): Promise<void> {
    try {
      const stats = await fs.stat(targetPath);
      
      if (stats.isDirectory()) {
        await fs.rmdir(targetPath, { recursive: true });
        logger.debug(`Cleaned up directory: ${targetPath}`);
      } else {
        await fs.unlink(targetPath);
        logger.debug(`Cleaned up file: ${targetPath}`);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File already doesn't exist, that's fine
    }
  }

  /**
   * Cancel scheduled cleanup for a file
   */
  cancelCleanup(filePath: string): void {
    if (this.cleanupTasks.has(filePath)) {
      clearTimeout(this.cleanupTasks.get(filePath)!);
      this.cleanupTasks.delete(filePath);
      logger.debug(`Cancelled cleanup for ${filePath}`);
    }
  }

  /**
   * Create a temporary file with automatic cleanup
   */
  async createTempFile(options: {
    prefix?: string;
    suffix?: string;
    cleanupDelayMs?: number;
  } = {}): Promise<{ path: string; cleanup: () => Promise<void> }> {
    
    return new Promise((resolve, reject) => {
      tmp.file({
        prefix: options.prefix || 'voxflow-',
        postfix: options.suffix || '.tmp',
        keep: true, // We'll handle cleanup ourselves
      }, (err, path, fd, cleanup) => {
        if (err) {
          reject(err);
          return;
        }

        // Close the file descriptor immediately
        fs.close(fd).catch(() => {});

        const customCleanup = async () => {
          this.cancelCleanup(path);
          await this.cleanupPath(path);
        };

        // Schedule automatic cleanup
        if (options.cleanupDelayMs !== 0) {
          this.scheduleCleanup(path, options.cleanupDelayMs || 300000);
        }

        resolve({
          path,
          cleanup: customCleanup,
        });
      });
    });
  }

  /**
   * Create a temporary directory with automatic cleanup
   */
  async createTempDirectory(options: {
    prefix?: string;
    cleanupDelayMs?: number;
  } = {}): Promise<{ path: string; cleanup: () => Promise<void> }> {
    
    return new Promise((resolve, reject) => {
      tmp.dir({
        prefix: options.prefix || 'voxflow-',
        keep: true, // We'll handle cleanup ourselves
      }, (err, path, cleanup) => {
        if (err) {
          reject(err);
          return;
        }

        const customCleanup = async () => {
          this.cancelCleanup(path);
          await this.cleanupPath(path);
        };

        // Schedule automatic cleanup
        if (options.cleanupDelayMs !== 0) {
          this.scheduleCleanup(path, options.cleanupDelayMs || 300000);
        }

        resolve({
          path,
          cleanup: customCleanup,
        });
      });
    });
  }

  /**
   * Clean up old temporary files
   */
  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const tmpDir = process.env.TMPDIR || '/tmp';
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(tmpDir);
      const now = Date.now();

      for (const file of files) {
        if (file.startsWith('voxflow-')) {
          const filePath = path.join(tmpDir, file);
          
          try {
            const stats = await fs.stat(filePath);
            const age = now - stats.mtime.getTime();

            if (age > maxAgeMs && !this.protectedFiles.has(filePath)) {
              await this.cleanupPath(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // File might have been deleted, continue
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} old temporary files`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }

    return cleanedCount;
  }

  /**
   * Get statistics about cleanup service
   */
  getStats(): {
    scheduledCleanups: number;
    protectedFiles: number;
  } {
    return {
      scheduledCleanups: this.cleanupTasks.size,
      protectedFiles: this.protectedFiles.size,
    };
  }

  /**
   * Clean up all scheduled tasks and files
   */
  private cleanupAll(): void {
    // Cancel all scheduled cleanups
    for (const [filePath, timeout] of this.cleanupTasks.entries()) {
      clearTimeout(timeout);
    }
    this.cleanupTasks.clear();

    // Note: We don't delete files synchronously on exit
    // as it might block the process shutdown
  }
}

// Global instance
export const cleanupService = new CleanupService();