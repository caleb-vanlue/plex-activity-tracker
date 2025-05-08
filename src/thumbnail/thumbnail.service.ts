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
      'http://localhost:3001',
    );
  }

  async findExistingThumbnail(metadata: {
    type: string;
    ratingKey?: string;
    parentRatingKey?: string;
    grandparentRatingKey?: string;
  }): Promise<string | null> {
    if (!metadata.type) {
      return null;
    }

    try {
      let params: any = {
        mediaType: metadata.type,
      };

      if (metadata.ratingKey) {
        params.ratingKey = metadata.ratingKey;
      }
      if (metadata.parentRatingKey) {
        params.parentRatingKey = metadata.parentRatingKey;
      }
      if (metadata.grandparentRatingKey) {
        params.grandparentRatingKey = metadata.grandparentRatingKey;
      }

      const response = await lastValueFrom(
        this.httpService
          .get(`${this.fileStorageApiUrl}/files/plex/thumbnail`, { params })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              if (error.response?.status === 404) {
                return throwError(() => ({ notFound: true }));
              }
              this.logger.error(
                `Error checking existing thumbnail: ${error.message}`,
                error.stack,
              );
              return throwError(() => error);
            }),
          ),
      );

      this.logger.debug(
        `Found existing thumbnail: ${response.id} for ${metadata.type}`,
      );

      return response.id;
    } catch (error) {
      if (error.notFound) {
        this.logger.debug(`No existing thumbnail found for ${metadata.type}`);
        return null;
      }

      this.logger.error(`Error finding existing thumbnail: ${error.message}`);
      return null;
    }
  }

  async saveThumbnail(
    file: Express.Multer.File,
    metadata: {
      type: string;
      title?: string;
      ratingKey?: string;
      parentRatingKey?: string;
      parentTitle?: string;
      grandparentRatingKey?: string;
      grandparentTitle?: string;
    },
  ): Promise<string | null> {
    if (!file || !metadata.type) {
      return null;
    }

    try {
      console.log({
        type: metadata.type,
        ratingKey: metadata.ratingKey,
        parentRatingKey: metadata.parentRatingKey,
        grandparentRatingKey: metadata.grandparentRatingKey,
      });
      const existingThumbnailId = await this.findExistingThumbnail({
        type: metadata.type,
        ratingKey: metadata.ratingKey,
        parentRatingKey: metadata.parentRatingKey,
        grandparentRatingKey: metadata.grandparentRatingKey,
      });

      if (existingThumbnailId) {
        this.logger.debug(
          `Using existing thumbnail (${existingThumbnailId}) for ${metadata.type}`,
        );
        return existingThumbnailId;
      }

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

      const referenceType = `plex-${metadata.type}`;
      let referenceId = metadata.ratingKey;

      if (metadata.type === 'track' && metadata.parentRatingKey) {
        referenceId = metadata.parentRatingKey;
      } else if (metadata.type === 'episode' && metadata.grandparentRatingKey) {
        referenceId = metadata.grandparentRatingKey;
      }

      formData.append('referenceType', referenceType);
      if (referenceId) {
        formData.append('referenceId', referenceId);
      }
      formData.append('isPublic', 'true');

      formData.append('plexMediaType', metadata.type);
      if (metadata.ratingKey) {
        formData.append('plexRatingKey', metadata.ratingKey);
      }
      if (metadata.parentRatingKey) {
        formData.append('plexParentRatingKey', metadata.parentRatingKey);
      }
      if (metadata.grandparentRatingKey) {
        formData.append(
          'plexGrandparentRatingKey',
          metadata.grandparentRatingKey,
        );
      }
      if (metadata.title || metadata.parentTitle || metadata.grandparentTitle) {
        const title =
          metadata.title || metadata.parentTitle || metadata.grandparentTitle;
        formData.append('plexTitle', title);
      }

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
