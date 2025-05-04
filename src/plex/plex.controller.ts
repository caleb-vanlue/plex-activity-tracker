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

      let thumbnailPath: string | null = null;
      if (thumbnail) {
        thumbnailPath = await this.thumbnailService.saveThumbnail(thumbnail);
      }

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
          thumbnailUrl: thumbnailPath ? `/thumbnails/${thumbnailPath}` : null,
          raw: payload,
        };

        this.eventEmitter.emit('plex.trackEvent', trackData);

        this.logger.log(
          `Track ${trackData.state}: ${trackData.title} by ${trackData.artist}`,
        );
      } else if (payload.Metadata?.type === 'movie') {
        const movieData = {
          eventType: payload.event,
          ratingKey: payload.Metadata.ratingKey,
          title: payload.Metadata.title,
          type: 'movie',
          year: payload.Metadata.year,
          director: this.extractDirector(payload.Metadata),
          studio: payload.Metadata.studio,
          summary: payload.Metadata.summary,
          duration: payload.Metadata.duration,
          state: this.mapEventToState(payload.event),
          user: payload.Account?.title,
          player: payload.Player?.title,
          timestamp: new Date().toISOString(),
          thumbnailUrl: thumbnailPath ? `/thumbnails/${thumbnailPath}` : null,
          raw: payload,
        };

        this.eventEmitter.emit('plex.videoEvent', movieData);

        this.logger.log(
          `Movie ${movieData.state}: ${movieData.title} (${movieData.year})`,
        );
      } else if (payload.Metadata?.type === 'episode') {
        const episodeData = {
          eventType: payload.event,
          ratingKey: payload.Metadata.ratingKey,
          title: payload.Metadata.title,
          type: 'episode',
          showTitle: payload.Metadata.grandparentTitle,
          season: payload.Metadata.parentIndex,
          episode: payload.Metadata.index,
          summary: payload.Metadata.summary,
          duration: payload.Metadata.duration,
          state: this.mapEventToState(payload.event),
          user: payload.Account?.title,
          player: payload.Player?.title,
          timestamp: new Date().toISOString(),
          thumbnailUrl: thumbnailPath ? `/thumbnails/${thumbnailPath}` : null,
          raw: payload,
        };

        this.eventEmitter.emit('plex.videoEvent', episodeData);

        this.logger.log(
          `Episode ${episodeData.state}: ${episodeData.title} (${episodeData.showTitle} S${episodeData.season}E${episodeData.episode})`,
        );
      } else {
        this.logger.debug(`Ignoring event for type: ${payload.Metadata?.type}`);
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
  async getCurrentMedia(@Query('type') type: string = 'all') {
    if (type === 'track') {
      return this.historyService.getCurrentTrack();
    } else if (type === 'movie') {
      return this.historyService.getCurrentMovie();
    } else if (type === 'episode') {
      return this.historyService.getCurrentEpisode();
    } else {
      return {
        track: await this.historyService.getCurrentTrack(),
        movie: await this.historyService.getCurrentMovie(),
        episode: await this.historyService.getCurrentEpisode(),
      };
    }
  }

  @Get('history')
  async getHistory(
    @Query('type') type: string = 'all',
    @Query('limit') limit: number = 10,
  ) {
    if (type === 'track') {
      return this.historyService.getRecentTracks(limit);
    } else if (type === 'movie') {
      return this.historyService.getRecentMovies(limit);
    } else if (type === 'episode') {
      return this.historyService.getRecentEpisodes(limit);
    } else {
      return {
        tracks: await this.historyService.getRecentTracks(limit),
        movies: await this.historyService.getRecentMovies(limit),
        episodes: await this.historyService.getRecentEpisodes(limit),
      };
    }
  }

  @Get('stats')
  async getMediaStats(
    @Query('type') type: string = 'all',
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    if (type === 'track') {
      return this.historyService.getListeningStats(timeframe);
    } else if (type === 'movie') {
      return this.historyService.getMovieWatchingStats(timeframe);
    } else if (type === 'episode') {
      return this.historyService.getTVWatchingStats(timeframe);
    } else {
      return {
        music: await this.historyService.getListeningStats(timeframe),
        movies: await this.historyService.getMovieWatchingStats(timeframe),
        tv: await this.historyService.getTVWatchingStats(timeframe),
      };
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

  private extractDirector(metadata: any): string | null {
    if (!metadata.Director || !metadata.Director.length) {
      return null;
    }

    if (Array.isArray(metadata.Director)) {
      return metadata.Director.map((d: any) => d.tag || d.name || d).join(', ');
    }

    if (typeof metadata.Director === 'object') {
      return metadata.Director.tag || metadata.Director.name || null;
    }

    return metadata.Director;
  }
}
