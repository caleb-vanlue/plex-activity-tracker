import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Episode } from 'src/media/entities/episode.entity';
import { Movie } from 'src/media/entities/movie.entity';
import { Track } from 'src/media/entities/track.entity';

@Injectable()
export class MediaEventService {
  private readonly logger = new Logger(MediaEventService.name);
  private currentMedia: {
    track: Track | null;
    movie: Movie | null;
    episode: Episode | null;
  } = {
    track: null,
    movie: null,
    episode: null,
  };

  constructor(
    private eventEmitter: EventEmitter2,
    private trackRepository: TrackRepository,
    private movieRepository: MovieRepository,
    private episodeRepository: EpisodeRepository,
  ) {}

  async processPlexWebhook(
    payload: any,
    thumbnailId: string | null,
  ): Promise<any> {
    if (!payload.Metadata?.type) {
      this.logger.warn('Received webhook without metadata type');
      return null;
    }

    const eventType = payload.event;
    const mediaType = payload.Metadata.type;
    const state = this.mapEventToState(eventType);

    this.logger.debug(
      `Processing ${mediaType} event: ${eventType} for ${payload.Metadata?.title}`,
    );

    switch (mediaType) {
      case 'track':
        return this.processTrackEvent(payload, state, thumbnailId);
      case 'movie':
        return this.processMovieEvent(payload, state, thumbnailId);
      case 'episode':
        return this.processEpisodeEvent(payload, state, thumbnailId);
      default:
        this.logger.debug(`Ignoring event for unsupported type: ${mediaType}`);
        return null;
    }
  }

  private async processTrackEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
  ): Promise<any> {
    const now = new Date();
    const trackData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      artist: payload.Metadata.grandparentTitle,
      album: payload.Metadata.parentTitle,
      state,
      user: payload.Account?.title,
      player: payload.Player?.title,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let track = await this.trackRepository.findByRatingKey(trackData.ratingKey);

    if (!track) {
      track = await this.trackRepository.create({
        ...trackData,
        startTime: now,
      });

      if (track && track.title && track.artist) {
        this.logger.log(`Created new track: ${track.title} by ${track.artist}`);
      }
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          track.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          track.startTime
        ) {
          const sessionTime = now.getTime() - track.startTime.getTime();
          updates.listenedMs = (track.listenedMs || 0) + sessionTime;
          updates.startTime = now;
        } else if (track.state !== 'playing') {
          updates.startTime = now;
        }
      } else if (
        (state === 'paused' || state === 'stopped') &&
        track.state === 'playing' &&
        track.startTime
      ) {
        updates.endTime = now;
        const sessionTime = now.getTime() - track.startTime.getTime();
        updates.listenedMs = (track.listenedMs || 0) + sessionTime;
      }

      await this.trackRepository.update(track.id, updates);
      track = await this.trackRepository.findById(track.id);
    }

    if (state === 'playing') {
      this.currentMedia.track = track;
    } else if (this.currentMedia.track?.id === track?.id) {
      this.currentMedia.track = state === 'paused' ? track : null;
    }

    const eventData = { ...trackData, timestamp: now.toISOString() };
    this.eventEmitter.emit('plex.trackEvent', eventData);

    return track;
  }

  private async processMovieEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
  ): Promise<any> {
    const now = new Date();
    const movieData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      year: payload.Metadata.year,
      director: this.extractDirector(payload.Metadata),
      studio: payload.Metadata.studio,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      state,
      user: payload.Account?.title,
      player: payload.Player?.title,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let movie = await this.movieRepository.findByRatingKey(movieData.ratingKey);

    if (!movie) {
      movie = await this.movieRepository.create({
        ...movieData,
        startTime: now,
      });

      this.logger.log(`Created new movie: ${movie.title} (${movie.year})`);
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          movie.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          movie.startTime
        ) {
          const sessionTime = now.getTime() - movie.startTime.getTime();
          updates.watchedMs = (movie.watchedMs || 0) + sessionTime;

          if (movie.duration) {
            updates.percentComplete =
              updates.watchedMs / (movie.duration * 1000);
          }

          updates.startTime = now;
        } else if (movie.state !== 'playing') {
          updates.startTime = now;
        }
      } else if (
        (state === 'paused' || state === 'stopped') &&
        movie.state === 'playing' &&
        movie.startTime
      ) {
        updates.endTime = now;
        const sessionTime = now.getTime() - movie.startTime.getTime();
        updates.watchedMs = (movie.watchedMs || 0) + sessionTime;

        if (movie.duration) {
          updates.percentComplete = updates.watchedMs / (movie.duration * 1000);
        }
      }

      await this.movieRepository.update(movie.id, updates);
      movie = await this.movieRepository.findById(movie.id);
    }

    if (state === 'playing') {
      this.currentMedia.movie = movie;
    } else if (this.currentMedia.movie?.id === movie?.id) {
      this.currentMedia.movie = state === 'paused' ? movie : null;
    }

    const eventData = { ...movieData, timestamp: now.toISOString() };
    this.eventEmitter.emit('plex.videoEvent', eventData);

    return movie;
  }

  private async processEpisodeEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
  ): Promise<any> {
    const now = new Date();
    const episodeData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      showTitle: payload.Metadata.grandparentTitle,
      season: payload.Metadata.parentIndex,
      episode: payload.Metadata.index,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      state,
      user: payload.Account?.title,
      player: payload.Player?.title,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let episode = await this.episodeRepository.findByRatingKey(
      episodeData.ratingKey,
    );

    if (!episode) {
      episode = await this.episodeRepository.create({
        ...episodeData,
        startTime: now,
      });

      this.logger.log(
        `Created new episode: ${episode.title} (${episode.showTitle} S${episode.season}E${episode.episode})`,
      );
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          episode.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          episode.startTime
        ) {
          const sessionTime = now.getTime() - episode.startTime.getTime();
          updates.watchedMs = (episode.watchedMs || 0) + sessionTime;

          if (episode.duration) {
            updates.percentComplete =
              updates.watchedMs / (episode.duration * 1000);
          }

          updates.startTime = now;
        } else if (episode.state !== 'playing') {
          updates.startTime = now;
        }
      } else if (
        (state === 'paused' || state === 'stopped') &&
        episode.state === 'playing' &&
        episode.startTime
      ) {
        updates.endTime = now;
        const sessionTime = now.getTime() - episode.startTime.getTime();
        updates.watchedMs = (episode.watchedMs || 0) + sessionTime;

        if (episode.duration) {
          updates.percentComplete =
            updates.watchedMs / (episode.duration * 1000);
        }
      }

      await this.episodeRepository.update(episode.id, updates);
      episode = await this.episodeRepository.findById(episode.id);
    }

    if (state === 'playing') {
      this.currentMedia.episode = episode;
    } else if (this.currentMedia.episode?.id === episode?.id) {
      this.currentMedia.episode = state === 'paused' ? episode : null;
    }

    const eventData = { ...episodeData, timestamp: now.toISOString() };
    this.eventEmitter.emit('plex.videoEvent', eventData);

    return episode;
  }

  public getCurrentMedia(type: string): any {
    if (type === 'track' || type === 'movie' || type === 'episode') {
      return this.currentMedia[type];
    }
    return null;
  }

  private mapEventToState(event: string): string {
    switch (event) {
      case 'media.play':
      case 'media.resume':
      case 'media.scrobble':
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
    if (!metadata || !metadata.Director) {
      return null;
    }

    if (Array.isArray(metadata.Director)) {
      return metadata.Director.map((d: any) => d.tag || d.name || d).join(', ');
    }

    if (typeof metadata.Director === 'object') {
      return metadata.Director.tag || metadata.Director.name || null;
    }

    return String(metadata.Director);
  }
}
