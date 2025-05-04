import {
  Controller,
  Post,
  Body,
  Logger,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('webhooks')
export class PlexController {
  private readonly logger = new Logger(PlexController.name);

  constructor(private eventEmitter: EventEmitter2) {}

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
          thumbnailUrl: thumbnail ? `/thumbnails/${thumbnail.filename}` : null,
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
