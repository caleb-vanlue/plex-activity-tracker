import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly storagePath =
    process.env.THUMBNAIL_STORAGE_PATH || './uploads/thumbnails';

  async saveThumbnail(file: Express.Multer.File): Promise<string | null> {
    if (!file) {
      return null;
    }

    try {
      await fs.mkdir(this.storagePath, { recursive: true });

      const uniqueFilename = `${uuidv4()}${this.getExtension(file.originalname)}`;
      const filePath = join(this.storagePath, uniqueFilename);

      if (file.path) {
        await fs.copyFile(file.path, filePath);

        try {
          await fs.unlink(file.path);
        } catch (error) {
          this.logger.warn(
            `Failed to cleanup temporary file: ${error.message}`,
          );
        }
      } else if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
      }

      this.logger.log(`Thumbnail saved to ${filePath}`);
      return uniqueFilename;
    } catch (error) {
      this.logger.error(`Failed to save thumbnail: ${error.message}`);
      return null;
    }
  }

  async getThumbnailPath(filename: string): Promise<string | null> {
    if (!filename) return null;
    return join(this.storagePath, filename);
  }

  private getExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }
}
