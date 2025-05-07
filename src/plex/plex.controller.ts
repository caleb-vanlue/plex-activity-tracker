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
import { createReadStream } from 'fs';
import { ThumbnailService } from '../thumbnail/thumbnail.service';
import { MediaEventService } from '../media/media-event.service';
import { MediaService } from '../media/media.service';

@Controller('webhooks')
export class PlexController {
  private readonly logger = new Logger(PlexController.name);

  constructor(
    private mediaEventService: MediaEventService,
    private mediaService: MediaService,
    private thumbnailService: ThumbnailService,
  ) {}

  @Post('plex')
  @UseInterceptors(FileInterceptor('thumb'))
  async handlePlexWebhook(
    @Body() body: any,
    @UploadedFile() thumbnail: Express.Multer.File | null,
  ) {
    try {
      const payload = body.payload ? JSON.parse(body.payload) : body;

      this.logger.debug(
        `Received webhook: ${payload.event} for ${payload.Metadata?.title}`,
      );

      let thumbnailId: string | null = null;
      if (thumbnail) {
        thumbnailId = await this.thumbnailService.saveThumbnail(thumbnail);
      }

      await this.mediaEventService.processPlexWebhook(payload, thumbnailId);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Get('thumbnails/:filename')
  async getThumbnail(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.thumbnailService.getThumbnailUrl(filename);
      if (!filePath) {
        return res.status(404).send({ error: 'Thumbnail not found' });
      }

      const stream = createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving thumbnail: ${error.message}`);
      return res.status(500).send({ error: 'Failed to serve thumbnail' });
    }
  }

  @Get('current')
  async getCurrentMedia(@Query('type') type: string = 'all') {
    if (type !== 'all') {
      return this.mediaService.getCurrentMedia(type);
    }

    return this.mediaService.getCurrentMedia('all');
  }

  @Get('history')
  async getHistory(
    @Query('type') type: string = 'all',
    @Query('limit') limit: number = 10,
  ) {
    if (type === 'track') {
      return this.mediaService.getRecentTracks(limit);
    } else if (type === 'movie') {
      return this.mediaService.getRecentMovies(limit);
    } else if (type === 'episode') {
      return this.mediaService.getRecentEpisodes(limit);
    } else {
      return {
        tracks: await this.mediaService.getRecentTracks(limit),
        movies: await this.mediaService.getRecentMovies(limit),
        episodes: await this.mediaService.getRecentEpisodes(limit),
      };
    }
  }

  @Get('stats')
  async getMediaStats(
    @Query('type') type: string = 'all',
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    if (type === 'track') {
      return this.mediaService.getListeningStats(timeframe);
    } else if (type === 'movie') {
      return this.mediaService.getMovieWatchingStats(timeframe);
    } else if (type === 'episode') {
      return this.mediaService.getTVWatchingStats(timeframe);
    } else {
      return {
        music: await this.mediaService.getListeningStats(timeframe),
        movies: await this.mediaService.getMovieWatchingStats(timeframe),
        tv: await this.mediaService.getTVWatchingStats(timeframe),
      };
    }
  }
}
