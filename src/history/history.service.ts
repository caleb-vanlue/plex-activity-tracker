import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TrackRepository } from './track.repository';
import { ThumbnailService } from 'src/thumbnail/thumbnail.service';
import { Track } from './entities/track.entity';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private currentTrack: Track | null = null;

  constructor(private trackRepository: TrackRepository) {}

  @OnEvent('plex.trackEvent')
  async handleTrackEvent(event: any) {
    try {
      this.logger.log(
        `Received track event: ${event.state} for "${event.title}" by ${event.artist}`,
      );

      switch (event.state) {
        case 'playing':
          await this.handlePlayingState(event);
          break;
        case 'paused':
          await this.handlePausedState(event);
          break;
        case 'stopped':
          await this.handleStoppedState(event);
          break;
        default:
          this.logger.log(`Unknown state: ${event.state}`);
      }
    } catch (error) {
      this.logger.error(`Error handling track event: ${error.message}`);
    }
  }

  private async handlePlayingState(event: any) {
    let thumbnailPath;
    if (event.thumbnailUrl) {
      const filename = event.thumbnailUrl.split('/').pop();
      if (filename) {
        thumbnailPath = filename;
      }
    }

    const existingTrack = await this.trackRepository.findByRatingKey(
      event.ratingKey,
    );

    if (
      this.currentTrack &&
      (this.currentTrack.state === 'playing' ||
        this.currentTrack.state === 'paused') &&
      this.currentTrack.ratingKey !== event.ratingKey
    ) {
      const endTime = new Date();
      const startTime = this.currentTrack.startTime;
      let listenedMs = endTime.getTime() - startTime.getTime();

      await this.trackRepository.updateTrack(this.currentTrack.id, {
        state: 'skipped',
        endTime,
        listenedMs,
      });

      this.logger.log('=== TRACK SKIPPED ===');
      this.logger.log(
        `Previous track: "${this.currentTrack.title}" by ${this.currentTrack.artist}`,
      );
      this.logger.log(`Previous state: ${this.currentTrack.state}`);
      this.logger.log(
        `Duration listened: ${Math.floor(listenedMs / 1000)} seconds`,
      );
      this.logger.log(`Skipped at: ${endTime.toISOString()}`);
      this.logger.log(`Track ID: ${this.currentTrack.id}`);
    }

    const activeTracks = await this.trackRepository.find({
      where: [{ state: 'playing' }, { state: 'paused' }],
    });

    for (const track of activeTracks) {
      if (track.ratingKey !== event.ratingKey) {
        await this.trackRepository.updateTrack(track.id, {
          state: 'skipped',
          endTime: new Date(),
          listenedMs: track.startTime
            ? new Date().getTime() - track.startTime.getTime()
            : 0,
        });
        this.logger.log(
          `Marked ${track.state} track "${track.title}" as skipped`,
        );
      }
    }

    if (
      !existingTrack ||
      existingTrack.state === 'stopped' ||
      existingTrack.state === 'skipped'
    ) {
      const trackData = {
        ratingKey: event.ratingKey,
        title: event.title,
        artist: event.artist,
        album: event.album,
        state: 'playing',
        user: event.user,
        player: event.player,
        startTime: new Date(),
        rawData: event.raw,
        thumbnailPath,
      };

      this.currentTrack = await this.trackRepository.createTrack(trackData);

      this.logger.log('=== TRACK STARTED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(`Album: ${event.album}`);
      this.logger.log(`User: ${event.user}`);
      this.logger.log(`Player: ${event.player}`);
      this.logger.log(`Start time: ${new Date().toISOString()}`);
      this.logger.log(`Track ID: ${this.currentTrack.id}`);
    } else if (existingTrack.state === 'paused') {
      this.currentTrack = await this.trackRepository.updateTrack(
        existingTrack.id,
        {
          state: 'playing',
        },
      );

      this.logger.log(`Track resumed: "${event.title}" by ${event.artist}`);
    }
  }

  private async handlePausedState(event: any) {
    if (this.currentTrack && this.currentTrack.ratingKey === event.ratingKey) {
      const pausedAt = new Date();

      this.currentTrack = await this.trackRepository.updateTrack(
        this.currentTrack.id,
        {
          state: 'paused',
          pausedAt,
        },
      );

      this.logger.log('=== TRACK PAUSED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(`Paused at: ${pausedAt.toISOString()}`);
    }
  }

  private async handleStoppedState(event: any) {
    if (this.currentTrack && this.currentTrack.ratingKey === event.ratingKey) {
      const endTime = new Date();
      const startTime = this.currentTrack.startTime;
      let listenedMs = endTime.getTime() - startTime.getTime();

      this.currentTrack = await this.trackRepository.updateTrack(
        this.currentTrack.id,
        {
          state: 'stopped',
          endTime,
          listenedMs,
        },
      );

      this.logger.log('=== TRACK STOPPED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(
        `Duration listened: ${Math.floor(listenedMs / 1000)} seconds`,
      );
      this.logger.log(`Stopped at: ${endTime.toISOString()}`);
      this.logger.log(`Track ID: ${this.currentTrack?.id}`);

      this.currentTrack = null;
    }
  }

  async cleanupStaleTracks() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const staleTracks = await this.trackRepository.find({
      where: [
        {
          state: 'playing',
          startTime: {
            $lt: oneHourAgo,
          },
        },
        {
          state: 'paused',
          startTime: {
            $lt: oneHourAgo,
          },
        },
      ],
    });

    for (const track of staleTracks) {
      await this.trackRepository.updateTrack(track.id, {
        state: 'skipped',
        endTime: new Date(),
        listenedMs: track.startTime
          ? new Date().getTime() - track.startTime.getTime()
          : 0,
      });
      this.logger.log(
        `Cleaned up stale ${track.state} track: "${track.title}" by ${track.artist}`,
      );
    }
  }

  async getCurrentTrack() {
    if (this.currentTrack) {
      return this.currentTrack;
    }

    const latestTrack = await this.trackRepository.findOne({
      where: { state: 'playing' },
      order: { startTime: 'DESC' },
    });

    return latestTrack || { state: 'idle' };
  }

  async getTrackById(id: string) {
    return this.trackRepository.findOne({ where: { id } });
  }

  async getRecentTracks(limit: number = 10) {
    return this.trackRepository.findRecentTracks(limit);
  }

  async getTracksByArtist(artist: string, limit: number = 10) {
    return this.trackRepository.findByArtist(artist, limit);
  }

  async getTracksByAlbum(album: string, limit: number = 10) {
    return this.trackRepository.findByAlbum(album, limit);
  }

  async getTracksByState(state: string, limit: number = 10) {
    return this.trackRepository.find({
      where: { state },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getListeningStats(timeframe: 'day' | 'week' | 'month' | 'all' = 'all') {
    return this.trackRepository.getListeningStats(timeframe);
  }

  async getTopArtists(timeframe: 'day' | 'week' | 'month' | 'all' = 'all') {
    return this.trackRepository.query(`
      SELECT 
        artist,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks t
      WHERE "listenedMs" IS NOT NULL 
      ${this.getTimeframeCondition(timeframe)}
      GROUP BY artist
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `);
  }

  async getTopAlbums(timeframe: 'day' | 'week' | 'month' | 'all' = 'all') {
    return this.trackRepository.query(`
      SELECT 
        album,
        artist,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks t
      WHERE "listenedMs" IS NOT NULL 
      ${this.getTimeframeCondition(timeframe)}
      GROUP BY album, artist
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `);
  }

  private getTimeframeCondition(
    timeframe: 'day' | 'week' | 'month' | 'all',
  ): string {
    switch (timeframe) {
      case 'day':
        return "AND start_time > NOW() - INTERVAL '1 day'";
      case 'week':
        return "AND start_time > NOW() - INTERVAL '7 days'";
      case 'month':
        return "AND start_time > NOW() - INTERVAL '30 days'";
      default:
        return '';
    }
  }
}
