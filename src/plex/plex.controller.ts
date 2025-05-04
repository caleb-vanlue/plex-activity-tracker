import {
  Controller,
  Post,
  Body,
  Logger,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { ThumbnailService } from 'src/thumbnail/thumbnail.service';
import { HistoryService } from 'src/history/history.service';

@Controller('webhooks')
export class PlexController {
  private readonly logger = new Logger(PlexController.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private thumbnailService: ThumbnailService,
    private historyService: HistoryService,
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

      if (payload.Metadata?.type === 'track') {
        let thumbnailPath: string | null = null;
        if (thumbnail) {
          thumbnailPath = await this.thumbnailService.saveThumbnail(thumbnail);
        }

        const trackData = {
          eventType: payload.event,
          ratingKey: payload.Metadata.ratingKey,
          title: payload.Metadata.title,
          artist: payload.Metadata.grandparentTitle,
          album: payload.Metadata.parentTitle,
          state: this.mapEventToState(payload.event),
          user: payload.Account?.title,
          player: payload.Player?.title,
          timestamp: new Date().toISOString(),
          thumbnailUrl: thumbnailPath ? `/thumbnails/${thumbnailPath}` : null,
          raw: payload,
        };

        this.eventEmitter.emit('plex.trackEvent', trackData);

        this.logger.log(
          `Track ${trackData.state}: ${trackData.title} by ${trackData.artist}`,
        );
      } else {
        this.logger.debug('Ignoring non-track event');
      }

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
      const filePath = await this.thumbnailService.getThumbnailPath(filename);
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
  async getCurrentTrack() {
    return this.historyService.getCurrentTrack();
  }

  @Get('history')
  async getTrackHistory(@Query('limit') limit: number = 10) {
    return this.historyService.getRecentTracks(limit);
  }

  @Get('stats')
  async getListeningStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.historyService.getListeningStats(timeframe);
  }

  private mapEventToState(event: string): string {
    switch (event) {
      case 'media.play':
      case 'media.resume':
        return 'playing';
      case 'media.pause':
        return 'paused';
      case 'media.stop':
        return 'stopped';
      default:
        return 'unknown';
    }
  }
}
