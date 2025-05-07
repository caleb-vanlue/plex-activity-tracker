import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as FormData from 'form-data';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly fileStorageApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.fileStorageApiUrl = this.configService.get<string>(
      'FILE_STORAGE_API_URL',
      'http://localhost:3000/files',
    );
  }

  async saveThumbnail(
    file: Express.Multer.File,
    referenceType?: string,
    referenceId?: string,
  ): Promise<string | null> {
    if (!file) {
      return null;
    }

    try {
      const formData = new FormData();

      if (file.buffer) {
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      } else if (file.path) {
        const fs = require('fs');
        formData.append('file', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      } else {
        throw new Error('File has neither buffer nor path');
      }

      if (referenceType) {
        formData.append('referenceType', referenceType);
      }
      if (referenceId) {
        formData.append('referenceId', referenceId);
      }
      formData.append('isPublic', 'true');

      const response = await lastValueFrom(
        this.httpService
          .post(`${this.fileStorageApiUrl}/files/upload`, formData, {
            headers: {
              ...formData.getHeaders(),
            },
          })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              this.logger.error(
                `Failed to upload thumbnail to file storage API: ${error.message}`,
                error.stack,
              );
              return throwError(() => error);
            }),
          ),
      );

      this.logger.log(
        `Thumbnail uploaded successfully. File ID: ${response.id}`,
      );

      return response.id;
    } catch (error) {
      this.logger.error(`Error uploading thumbnail: ${error.message}`);
      return null;
    }
  }

  getThumbnailUrl(fileId: string): string | null {
    if (!fileId) return null;
    return `${this.fileStorageApiUrl}/id/${fileId}`;
  }
}
