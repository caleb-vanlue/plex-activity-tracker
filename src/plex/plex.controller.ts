import {
  Controller,
  Post,
  Body,
  Logger,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ThumbnailService } from '../thumbnail/thumbnail.service';
import { MediaEventService } from '../media/media-event.service';
import { MediaService } from '../media/media.service';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { CurrentMediaDto } from '../common/dto/current-media.dto';
import { StatsQueryDto } from '../common/dto/stats-query.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class PlexController {
  private readonly logger = new Logger(PlexController.name);

  constructor(
    private mediaEventService: MediaEventService,
    private mediaService: MediaService,
    private thumbnailService: ThumbnailService,
  ) {}

  @ApiOperation({ summary: 'Process Plex webhook event' })
  @ApiBody({
    description: 'Plex webhook payload',
    type: Object,
    required: true,
  })
  @Post('plex')
  @UseInterceptors(FileInterceptor('thumb'))
  async handlePlexWebhook(
    @Body() body: any,
    @UploadedFile() thumbnail: Express.Multer.File | null,
  ) {
    try {
      const payload = body.payload ? JSON.parse(body.payload) : body;

      this.logger.debug(
        `Received webhook: ${payload.event} for ${payload.Metadata?.title} from user ${payload.Account?.title}`,
      );

      let thumbnailId: string | null = null;

      if (thumbnail && payload.Metadata) {
        const metadata = {
          type: payload.Metadata.type,
          title: payload.Metadata.title,
          ratingKey: payload.Metadata.ratingKey,
          parentRatingKey: payload.Metadata.parentRatingKey,
          parentTitle: payload.Metadata.parentTitle,
          grandparentRatingKey: payload.Metadata.grandparentRatingKey,
          grandparentTitle: payload.Metadata.grandparentTitle,
        };

        thumbnailId = await this.thumbnailService.saveThumbnail(
          thumbnail,
          metadata,
        );

        if (thumbnailId) {
          this.logger.debug(`Using thumbnail ID: ${thumbnailId}`);
        }
      }

      const result = await this.mediaEventService.processPlexWebhook(
        payload,
        thumbnailId,
      );

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @ApiOperation({ summary: 'Get thumbnail by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the thumbnail to fetch',
  })
  @Get('thumbnails/:id')
  async getThumbnail(@Param('id') id: string, @Res() res: Response) {
    try {
      const thumbnailUrl = this.thumbnailService.getThumbnailUrl(id);

      if (!thumbnailUrl) {
        return res.status(404).send({ error: 'Thumbnail not found' });
      }

      return res.redirect(thumbnailUrl);
    } catch (error) {
      this.logger.error(`Error serving thumbnail: ${error.message}`);
      return res.status(500).send({ error: 'Failed to serve thumbnail' });
    }
  }

  @ApiOperation({ summary: 'Get recent media history' })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Type of media to fetch (track, movie, episode, all)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items to return',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by specific user',
  })
  @Get('history')
  async getHistory(
    @Query('type') type: string = 'all',
    @Query('limit') limit: number = 10,
    @Query('user') user?: string,
  ) {
    if (type === 'track') {
      return this.mediaService.getRecentTracks(limit, user);
    } else if (type === 'movie') {
      return this.mediaService.getRecentMovies(limit, user);
    } else if (type === 'episode') {
      return this.mediaService.getRecentEpisodes(limit, user);
    } else {
      if (user) {
        return {
          user,
          tracks: await this.mediaService.getRecentTracks(limit, user),
          movies: await this.mediaService.getRecentMovies(limit, user),
          episodes: await this.mediaService.getRecentEpisodes(limit, user),
        };
      } else {
        return {
          tracks: await this.mediaService.getRecentTracks(limit),
          movies: await this.mediaService.getRecentMovies(limit),
          episodes: await this.mediaService.getRecentEpisodes(limit),
        };
      }
    }
  }
}
