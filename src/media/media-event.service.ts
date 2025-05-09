import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Episode } from 'src/media/entities/episode.entity';
import { Movie } from 'src/media/entities/movie.entity';
import { Track } from 'src/media/entities/track.entity';

interface UserMediaSessions {
  tracks: Map<string, Track>;
  movies: Map<string, Movie>;
  episodes: Map<string, Episode>;
}

@Injectable()
export class MediaEventService implements OnModuleInit {
  private readonly logger = new Logger(MediaEventService.name);

  private userSessions: Map<string, UserMediaSessions> = new Map();

  private allActiveSessions: {
    tracks: Map<string, Track>;
    movies: Map<string, Movie>;
    episodes: Map<string, Episode>;
  } = {
    tracks: new Map(),
    movies: new Map(),
    episodes: new Map(),
  };

  constructor(
    private eventEmitter: EventEmitter2,
    private trackRepository: TrackRepository,
    private movieRepository: MovieRepository,
    private episodeRepository: EpisodeRepository,
  ) {}

  async onModuleInit() {
    await this.initializeCurrentMedia();
  }

  private async initializeCurrentMedia() {
    const [tracks, movies, episodes] = await Promise.all([
      this.trackRepository.findByState('playing'),
      this.movieRepository.findByState('playing'),
      this.episodeRepository.findByState('playing'),
    ]);

    tracks.forEach((track) => {
      if (track.user) {
        this.addMediaToUserSession(track.user, 'tracks', track);
        this.allActiveSessions.tracks.set(track.id, track);
      }
    });

    movies.forEach((movie) => {
      if (movie.user) {
        this.addMediaToUserSession(movie.user, 'movies', movie);
        this.allActiveSessions.movies.set(movie.id, movie);
      }
    });

    episodes.forEach((episode) => {
      if (episode.user) {
        this.addMediaToUserSession(episode.user, 'episodes', episode);
        this.allActiveSessions.episodes.set(episode.id, episode);
      }
    });

    this.logger.log('Current media state initialized for all users');
  }

  private addMediaToUserSession(
    user: string,
    mediaType: 'tracks' | 'movies' | 'episodes',
    media: Track | Movie | Episode,
  ) {
    if (!this.userSessions.has(user)) {
      this.userSessions.set(user, {
        tracks: new Map<string, Track>(),
        movies: new Map<string, Movie>(),
        episodes: new Map<string, Episode>(),
      });
    }

    const userSession = this.userSessions.get(user);
    if (userSession) {
      if (mediaType === 'tracks') {
        userSession.tracks.set(media.id, media as Track);
      } else if (mediaType === 'movies') {
        userSession.movies.set(media.id, media as Movie);
      } else if (mediaType === 'episodes') {
        userSession.episodes.set(media.id, media as Episode);
      }
    }
  }

  private removeMediaFromUserSession(
    user: string,
    mediaType: 'tracks' | 'movies' | 'episodes',
    mediaId: string,
  ) {
    if (this.userSessions.has(user)) {
      const userSession = this.userSessions.get(user);
      if (userSession) {
        userSession[mediaType].delete(mediaId);

        if (
          userSession.tracks.size === 0 &&
          userSession.movies.size === 0 &&
          userSession.episodes.size === 0
        ) {
          this.userSessions.delete(user);
        }
      }
    }
  }

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
    const user = payload.Account?.title;

    if (!user) {
      this.logger.warn('Received webhook without user information');
      return null;
    }

    this.logger.debug(
      `Processing ${mediaType} event: ${eventType} for ${payload.Metadata?.title} by user ${user}`,
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
    const user = payload.Account?.title;

    if (!user) {
      this.logger.warn('Skipping track event without user information');
      return null;
    }

    const trackData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      artist: payload.Metadata.grandparentTitle,
      album: payload.Metadata.parentTitle,
      state,
      user,
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
        this.logger.log(
          `Created new track: ${track.title} by ${track.artist} for user ${user}`,
        );
      }
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          track.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          track.startTime
        ) {
          if (track.user === user) {
            const sessionTime = now.getTime() - track.startTime.getTime();
            updates.listenedMs = (track.listenedMs || 0) + sessionTime;
          }
          updates.startTime = now;
        } else if (track.state !== 'playing') {
          updates.startTime = now;
        }

        updates.user = user;
        updates.player = payload.Player?.title;
      } else if (
        (state === 'paused' || state === 'stopped') &&
        track.state === 'playing' &&
        track.startTime &&
        track.user === user
      ) {
        updates.endTime = now;
        const sessionTime = now.getTime() - track.startTime.getTime();
        updates.listenedMs = (track.listenedMs || 0) + sessionTime;
      }

      await this.trackRepository.update(track.id, updates);
      track = await this.trackRepository.findById(track.id);
    }

    if (state === 'playing') {
      const userSession = this.userSessions.get(user);
      if (userSession && track) {
        for (const [trackId, existingTrack] of userSession.tracks.entries()) {
          if (
            existingTrack.id !== track.id &&
            existingTrack.state === 'playing'
          ) {
            this.logger.debug(
              `Stopping track ${existingTrack.title} for user ${user} because a new track started playing`,
            );

            const updates: any = {
              state: 'stopped',
              endTime: now,
            };

            if (existingTrack.startTime) {
              const sessionTime =
                now.getTime() - existingTrack.startTime.getTime();
              updates.listenedMs =
                (existingTrack.listenedMs || 0) + sessionTime;
            }

            await this.trackRepository.update(existingTrack.id, updates);

            existingTrack.state = 'stopped';
            existingTrack.endTime = now;

            this.removeMediaFromUserSession(user, 'tracks', existingTrack.id);
            this.allActiveSessions.tracks.delete(existingTrack.id);
          }
        }
      }

      if (track) {
        this.addMediaToUserSession(user, 'tracks', track);
        this.allActiveSessions.tracks.set(track.id, track);
      }
    } else if (state === 'paused' || state === 'stopped') {
      if (track && state === 'paused') {
        this.addMediaToUserSession(user, 'tracks', track);
        this.allActiveSessions.tracks.set(track.id, track);
      } else if (track) {
        this.removeMediaFromUserSession(user, 'tracks', track.id);
        this.allActiveSessions.tracks.delete(track.id);
      }
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
    const user = payload.Account?.title;

    if (!user) {
      this.logger.warn('Skipping movie event without user information');
      return null;
    }

    const movieData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      year: payload.Metadata.year,
      director: this.extractDirector(payload.Metadata),
      studio: payload.Metadata.studio,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      state,
      user,
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

      this.logger.log(
        `Created new movie: ${movie.title} (${movie.year}) for user ${user}`,
      );
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          movie.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          movie.startTime
        ) {
          if (movie.user === user) {
            const sessionTime = now.getTime() - movie.startTime.getTime();
            updates.watchedMs = (movie.watchedMs || 0) + sessionTime;

            if (movie.duration) {
              updates.percentComplete =
                updates.watchedMs / (movie.duration * 1000);
            }
          }
          updates.startTime = now;
        } else if (movie.state !== 'playing') {
          updates.startTime = now;
        }

        updates.user = user;
        updates.player = payload.Player?.title;
      } else if (
        (state === 'paused' || state === 'stopped') &&
        movie.state === 'playing' &&
        movie.startTime &&
        movie.user === user
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
      const userSession = this.userSessions.get(user);
      if (userSession && movie) {
        for (const [movieId, existingMovie] of userSession.movies.entries()) {
          if (
            existingMovie.id !== movie.id &&
            existingMovie.state === 'playing'
          ) {
            this.logger.debug(
              `Stopping movie ${existingMovie.title} for user ${user} because a new movie started playing`,
            );

            const updates: any = {
              state: 'stopped',
              endTime: now,
            };

            if (existingMovie.startTime) {
              const sessionTime =
                now.getTime() - existingMovie.startTime.getTime();
              updates.watchedMs = (existingMovie.watchedMs || 0) + sessionTime;

              if (existingMovie.duration) {
                updates.percentComplete =
                  updates.watchedMs / (existingMovie.duration * 1000);
              }
            }

            await this.movieRepository.update(existingMovie.id, updates);

            existingMovie.state = 'stopped';
            existingMovie.endTime = now;

            this.removeMediaFromUserSession(user, 'movies', existingMovie.id);
            this.allActiveSessions.movies.delete(existingMovie.id);
          }
        }
      }

      if (movie) {
        this.addMediaToUserSession(user, 'movies', movie);
        this.allActiveSessions.movies.set(movie.id, movie);
      }
    } else if (state === 'paused' || state === 'stopped') {
      if (movie && state === 'paused') {
        this.addMediaToUserSession(user, 'movies', movie);
        this.allActiveSessions.movies.set(movie.id, movie);
      } else if (movie) {
        this.removeMediaFromUserSession(user, 'movies', movie.id);
        this.allActiveSessions.movies.delete(movie.id);
      }
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
    const user = payload.Account?.title;

    if (!user) {
      this.logger.warn('Skipping episode event without user information');
      return null;
    }

    const episodeData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      showTitle: payload.Metadata.grandparentTitle,
      season: payload.Metadata.parentIndex,
      episode: payload.Metadata.index,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      state,
      user,
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
        `Created new episode: ${episode.title} (${episode.showTitle} S${episode.season}E${episode.episode}) for user ${user}`,
      );
    } else {
      const updates: any = { state };

      if (state === 'playing') {
        if (
          episode.state === 'playing' &&
          payload.event === 'media.scrobble' &&
          episode.startTime
        ) {
          if (episode.user === user) {
            const sessionTime = now.getTime() - episode.startTime.getTime();
            updates.watchedMs = (episode.watchedMs || 0) + sessionTime;

            if (episode.duration) {
              updates.percentComplete =
                updates.watchedMs / (episode.duration * 1000);
            }
          }
          updates.startTime = now;
        } else if (episode.state !== 'playing') {
          updates.startTime = now;
        }

        updates.user = user;
        updates.player = payload.Player?.title;
      } else if (
        (state === 'paused' || state === 'stopped') &&
        episode.state === 'playing' &&
        episode.startTime &&
        episode.user === user
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
      const userSession = this.userSessions.get(user);
      if (userSession && episode) {
        for (const [
          episodeId,
          existingEpisode,
        ] of userSession.episodes.entries()) {
          if (
            existingEpisode.id !== episode.id &&
            existingEpisode.state === 'playing'
          ) {
            this.logger.debug(
              `Stopping episode ${existingEpisode.title} for user ${user} because a new episode started playing`,
            );

            const updates: any = {
              state: 'stopped',
              endTime: now,
            };

            if (existingEpisode.startTime) {
              const sessionTime =
                now.getTime() - existingEpisode.startTime.getTime();
              updates.watchedMs =
                (existingEpisode.watchedMs || 0) + sessionTime;

              if (existingEpisode.duration) {
                updates.percentComplete =
                  updates.watchedMs / (existingEpisode.duration * 1000);
              }
            }

            await this.episodeRepository.update(existingEpisode.id, updates);

            existingEpisode.state = 'stopped';
            existingEpisode.endTime = now;

            this.removeMediaFromUserSession(
              user,
              'episodes',
              existingEpisode.id,
            );
            this.allActiveSessions.episodes.delete(existingEpisode.id);
          }
        }
      }

      if (episode) {
        this.addMediaToUserSession(user, 'episodes', episode);
        this.allActiveSessions.episodes.set(episode.id, episode);
      }
    } else if (state === 'paused' || state === 'stopped') {
      if (episode && state === 'paused') {
        this.addMediaToUserSession(user, 'episodes', episode);
        this.allActiveSessions.episodes.set(episode.id, episode);
      } else if (episode) {
        this.removeMediaFromUserSession(user, 'episodes', episode.id);
        this.allActiveSessions.episodes.delete(episode.id);
      }
    }

    const eventData = { ...episodeData, timestamp: now.toISOString() };
    this.eventEmitter.emit('plex.videoEvent', eventData);

    return episode;
  }

  public getCurrentMedia(type: string, user?: string): any {
    if (user) {
      const userSession = this.userSessions.get(user);

      if (!userSession) {
        return type === 'all' ? { tracks: [], movies: [], episodes: [] } : [];
      }

      if (type === 'track') {
        return Array.from(userSession.tracks.values());
      } else if (type === 'movie') {
        return Array.from(userSession.movies.values());
      } else if (type === 'episode') {
        return Array.from(userSession.episodes.values());
      } else if (type === 'all') {
        return {
          tracks: Array.from(userSession.tracks.values()),
          movies: Array.from(userSession.movies.values()),
          episodes: Array.from(userSession.episodes.values()),
        };
      }
    } else {
      if (type === 'track') {
        return Array.from(this.allActiveSessions.tracks.values());
      } else if (type === 'movie') {
        return Array.from(this.allActiveSessions.movies.values());
      } else if (type === 'episode') {
        return Array.from(this.allActiveSessions.episodes.values());
      } else if (type === 'all') {
        return {
          tracks: Array.from(this.allActiveSessions.tracks.values()),
          movies: Array.from(this.allActiveSessions.movies.values()),
          episodes: Array.from(this.allActiveSessions.episodes.values()),
        };
      }
    }

    return [];
  }

  public getActiveUsers(): string[] {
    return Array.from(this.userSessions.keys());
  }

  private mapEventToState(event: string): string {
    switch (event) {
      case 'media.play':
      case 'media.resume':
      case 'media.scrobble':
      case 'playback.started':
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
