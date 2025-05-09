import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { UserMediaSessionRepository } from './repositories/user-media-session.repository';
import { Episode } from './entities/episode.entity';
import { Movie } from './entities/movie.entity';
import { Track } from './entities/track.entity';
import { UserMediaSession } from './entities/user-media-session.entity';
import { UserRepository } from './repositories/user.repository';

interface ActiveSessions {
  tracks: Map<string, UserMediaSession>;
  movies: Map<string, UserMediaSession>;
  episodes: Map<string, UserMediaSession>;
}

@Injectable()
export class MediaEventService implements OnModuleInit {
  private readonly logger = new Logger(MediaEventService.name);

  private userSessions: Map<string, ActiveSessions> = new Map();

  private allActiveSessions: {
    tracks: Map<string, UserMediaSession>;
    movies: Map<string, UserMediaSession>;
    episodes: Map<string, UserMediaSession>;
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
    private userRepository: UserRepository,
    private userMediaSessionRepository: UserMediaSessionRepository,
  ) {}

  async onModuleInit() {
    await this.initializeCurrentMedia();
  }

  private async initializeCurrentMedia() {
    const activeSessions =
      await this.userMediaSessionRepository.findAllActive();

    for (const session of activeSessions) {
      const userId = session.userId;

      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, {
          tracks: new Map<string, UserMediaSession>(),
          movies: new Map<string, UserMediaSession>(),
          episodes: new Map<string, UserMediaSession>(),
        });
      }

      const userSession = this.userSessions.get(userId);
      if (!userSession) {
        this.logger.warn(`User session not found for userId: ${userId}`);
        continue;
      }

      if (session.mediaType === 'track' && session.track) {
        userSession.tracks.set(session.id, session);
        this.allActiveSessions.tracks.set(session.id, session);
      } else if (session.mediaType === 'movie' && session.movie) {
        userSession.movies.set(session.id, session);
        this.allActiveSessions.movies.set(session.id, session);
      } else if (session.mediaType === 'episode' && session.episode) {
        userSession.episodes.set(session.id, session);
        this.allActiveSessions.episodes.set(session.id, session);
      }
    }

    this.logger.log('Current media state initialized for all users');
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
    const userName = payload.Account?.title;

    if (!userName) {
      this.logger.warn('Received webhook without user information');
      return null;
    }

    const user = await this.userRepository.findOrCreate(userName);

    this.logger.debug(
      `Processing ${mediaType} event: ${eventType} for ${payload.Metadata?.title} by user ${user.title}`,
    );

    switch (mediaType) {
      case 'track':
        return this.processTrackEvent(payload, state, thumbnailId, user.id);
      case 'movie':
        return this.processMovieEvent(payload, state, thumbnailId, user.id);
      case 'episode':
        return this.processEpisodeEvent(payload, state, thumbnailId, user.id);
      default:
        this.logger.debug(`Ignoring event for unsupported type: ${mediaType}`);
        return null;
    }
  }

  private async processTrackEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    const now = new Date();

    // Create or update the track entity (metadata only)
    const trackData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      artist: payload.Metadata.grandparentTitle,
      album: payload.Metadata.parentTitle,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    // Find or create track - now just a metadata container without user or state
    let track = await this.trackRepository.findByRatingKey(trackData.ratingKey);
    if (!track) {
      track = await this.trackRepository.create(trackData);
      this.logger.log(
        `Created new track metadata: ${track.title} by ${track.artist}`,
      );
    }

    // Find existing session for this track and user
    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'track',
      track.id,
    );

    if (state === 'playing') {
      // Stop any other playing tracks for this user
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveTracks(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== track.id) {
          this.logger.debug(
            `Stopping track ${activeSession.track.title} for user ${userId} because a new track started playing`,
          );

          const endTime = now;
          const sessionTime =
            endTime.getTime() - activeSession.startTime.getTime();

          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime,
            timeWatchedMs: activeSession.timeWatchedMs + sessionTime,
          });

          // Remove from session maps
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.tracks.delete(activeSession.id);
          }
          this.allActiveSessions.tracks.delete(activeSession.id);
        }
      }

      // Create or update current session
      if (!session) {
        session = await this.userMediaSessionRepository.create({
          userId,
          mediaType: 'track',
          mediaId: track.id,
          track,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title,
        });
      } else {
        if (session.state === 'playing' && payload.event === 'media.scrobble') {
          // Calculate watched time before restarting
          const sessionTime = now.getTime() - session.startTime.getTime();
          await this.userMediaSessionRepository.update(session.id, {
            timeWatchedMs: session.timeWatchedMs + sessionTime,
            startTime: now,
            state: 'playing',
            player: payload.Player?.title,
          });
        } else {
          await this.userMediaSessionRepository.update(session.id, {
            state: 'playing',
            startTime: now,
            player: payload.Player?.title,
          });
        }
        // Refresh session from database
        session = await this.userMediaSessionRepository.findById(session.id);
      }

      // Add to session maps
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, {
          tracks: new Map<string, UserMediaSession>(),
          movies: new Map<string, UserMediaSession>(),
          episodes: new Map<string, UserMediaSession>(),
        });
      }

      const userSession = this.userSessions.get(userId);
      if (!userSession || !session) {
        this.logger.warn(`User session not found for userId: ${userId}`);
        return null;
      }
      userSession.tracks.set(session.id, session);
      this.allActiveSessions.tracks.set(session.id, session);
    } else if (state === 'paused' || state === 'stopped') {
      if (session) {
        const endTime = now;
        const sessionTime = endTime.getTime() - session.startTime.getTime();

        await this.userMediaSessionRepository.update(session.id, {
          state,
          endTime,
          timeWatchedMs: session.timeWatchedMs + sessionTime,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
        if (!session) {
          this.logger.warn(`Session not found`);
          return null;
        }

        if (state === 'paused') {
          // Keep in session maps for paused state
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.tracks.set(session.id, session);
          }
          this.allActiveSessions.tracks.set(session.id, session);
        } else {
          // Remove from session maps for stopped state
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.tracks.delete(session.id);
          }
          this.allActiveSessions.tracks.delete(session.id);
        }
      }
    }

    // Emit event with session details
    const eventData = {
      type: 'track',
      trackId: track.id,
      sessionId: session?.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.trackEvent', eventData);

    return { track, session };
  }

  // Similar implementations for processMovieEvent and processEpisodeEvent...
  private async processMovieEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    // Implementation similar to processTrackEvent but for movies
    const now = new Date();

    const movieData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      year: payload.Metadata.year,
      director: this.extractDirector(payload.Metadata),
      studio: payload.Metadata.studio,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let movie = await this.movieRepository.findByRatingKey(movieData.ratingKey);
    if (!movie) {
      movie = await this.movieRepository.create(movieData);
      this.logger.log(
        `Created new movie metadata: ${movie.title} (${movie.year})`,
      );
    }

    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'movie',
      movie.id,
    );

    if (state === 'playing') {
      // Stop other playing movies
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveMovies(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== movie.id) {
          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });

          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.movies.delete(activeSession.id);
          }
          this.allActiveSessions.movies.delete(activeSession.id);
        }
      }

      // Create or update current session
      if (!session) {
        session = await this.userMediaSessionRepository.create({
          userId,
          mediaType: 'movie',
          mediaId: movie.id,
          movie,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title,
        });
      } else {
        if (session.state === 'playing' && payload.event === 'media.scrobble') {
          const sessionTime = now.getTime() - session.startTime.getTime();
          await this.userMediaSessionRepository.update(session.id, {
            timeWatchedMs: session.timeWatchedMs + sessionTime,
            startTime: now,
          });
        }

        await this.userMediaSessionRepository.update(session.id, {
          state: 'playing',
          player: payload.Player?.title,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
      }

      // Add to session maps
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, {
          tracks: new Map<string, UserMediaSession>(),
          movies: new Map<string, UserMediaSession>(),
          episodes: new Map<string, UserMediaSession>(),
        });
      }

      const userSession = this.userSessions.get(userId);
      if (!userSession || !session) {
        this.logger.warn(`User session not found for userId: ${userId}`);
        return null;
      }
      userSession.movies.set(session.id, session);
      this.allActiveSessions.movies.set(session.id, session);
    } else if (state === 'paused' || state === 'stopped') {
      if (session) {
        const sessionTime = now.getTime() - session.startTime.getTime();

        await this.userMediaSessionRepository.update(session.id, {
          state,
          endTime: now,
          timeWatchedMs: session.timeWatchedMs + sessionTime,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
        if (!session) {
          this.logger.warn(`Session not found`);
          return null;
        }

        if (state === 'paused') {
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.movies.set(session.id, session);
          }
          this.allActiveSessions.movies.set(session.id, session);
        } else {
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.movies.delete(session.id);
          }
          this.allActiveSessions.movies.delete(session.id);
        }
      }
    }

    const eventData = {
      type: 'movie',
      movieId: movie.id,
      sessionId: session?.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      studio: movie.studio,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.videoEvent', eventData);

    return { movie, session };
  }

  private async processEpisodeEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    // Implementation similar to processTrackEvent but for episodes
    const now = new Date();

    const episodeData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      showTitle: payload.Metadata.grandparentTitle,
      season: payload.Metadata.parentIndex,
      episode: payload.Metadata.index,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let episode = await this.episodeRepository.findByRatingKey(
      episodeData.ratingKey,
    );
    if (!episode) {
      episode = await this.episodeRepository.create(episodeData);
      this.logger.log(
        `Created new episode metadata: ${episode.title} (${episode.showTitle} S${episode.season}E${episode.episode})`,
      );
    }

    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'episode',
      episode.id,
    );

    // The rest is similar to the movie implementation
    if (state === 'playing') {
      // Stop other playing episodes
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveEpisodes(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== episode.id) {
          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });

          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.episodes.delete(activeSession.id);
          }
          this.allActiveSessions.episodes.delete(activeSession.id);
        }
      }

      // Create or update current session
      if (!session) {
        session = await this.userMediaSessionRepository.create({
          userId,
          mediaType: 'episode',
          mediaId: episode.id,
          episode,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title,
        });
      } else {
        if (session.state === 'playing' && payload.event === 'media.scrobble') {
          const sessionTime = now.getTime() - session.startTime.getTime();
          await this.userMediaSessionRepository.update(session.id, {
            timeWatchedMs: session.timeWatchedMs + sessionTime,
            startTime: now,
          });
        }

        await this.userMediaSessionRepository.update(session.id, {
          state: 'playing',
          player: payload.Player?.title,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
      }

      // Add to session maps
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, {
          tracks: new Map<string, UserMediaSession>(),
          movies: new Map<string, UserMediaSession>(),
          episodes: new Map<string, UserMediaSession>(),
        });
      }

      const userSession = this.userSessions.get(userId);
      if (!userSession || !session) {
        this.logger.warn(`User session not found for userId: ${userId}`);
        return null;
      }
      userSession.episodes.set(session.id, session);
      this.allActiveSessions.episodes.set(session.id, session);
    } else if (state === 'paused' || state === 'stopped') {
      if (session) {
        const sessionTime = now.getTime() - session.startTime.getTime();

        await this.userMediaSessionRepository.update(session.id, {
          state,
          endTime: now,
          timeWatchedMs: session.timeWatchedMs + sessionTime,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
        if (!session) {
          this.logger.warn(`Session not found`);
          return null;
        }

        if (state === 'paused') {
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.episodes.set(session.id, session);
          }
          this.allActiveSessions.episodes.set(session.id, session);
        } else {
          const userSession = this.userSessions.get(userId);
          if (userSession) {
            userSession.episodes.delete(session.id);
          }
          this.allActiveSessions.episodes.delete(session.id);
        }
      }
    }

    const eventData = {
      type: 'episode',
      episodeId: episode.id,
      sessionId: session?.id,
      title: episode.title,
      showTitle: episode.showTitle,
      season: episode.season,
      episode: episode.episode,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.videoEvent', eventData);

    return { episode, session };
  }

  public async getCurrentMedia(type: string, userId?: string): Promise<any> {
    if (userId) {
      const userSession = this.userSessions.get(userId);

      if (!userSession) {
        return type === 'all' ? { tracks: [], movies: [], episodes: [] } : [];
      }

      if (type === 'track') {
        return Array.from(userSession.tracks.values()).map((session) => ({
          ...session.track,
          sessionId: session.id,
          state: session.state,
          player: session.player,
          startTime: session.startTime,
        }));
      } else if (type === 'movie') {
        return Array.from(userSession.movies.values()).map((session) => ({
          ...session.movie,
          sessionId: session.id,
          state: session.state,
          player: session.player,
          startTime: session.startTime,
        }));
      } else if (type === 'episode') {
        return Array.from(userSession.episodes.values()).map((session) => ({
          ...session.episode,
          sessionId: session.id,
          state: session.state,
          player: session.player,
          startTime: session.startTime,
        }));
      } else if (type === 'all') {
        return {
          tracks: Array.from(userSession.tracks.values()).map((session) => ({
            ...session.track,
            sessionId: session.id,
            state: session.state,
            player: session.player,
            startTime: session.startTime,
          })),
          movies: Array.from(userSession.movies.values()).map((session) => ({
            ...session.movie,
            sessionId: session.id,
            state: session.state,
            player: session.player,
            startTime: session.startTime,
          })),
          episodes: Array.from(userSession.episodes.values()).map(
            (session) => ({
              ...session.episode,
              sessionId: session.id,
              state: session.state,
              player: session.player,
              startTime: session.startTime,
            }),
          ),
        };
      }
    } else {
      if (type === 'track') {
        return Array.from(this.allActiveSessions.tracks.values()).map(
          (session) => ({
            ...session.track,
            sessionId: session.id,
            state: session.state,
            userId: session.userId,
            player: session.player,
            startTime: session.startTime,
          }),
        );
      } else if (type === 'movie') {
        return Array.from(this.allActiveSessions.movies.values()).map(
          (session) => ({
            ...session.movie,
            sessionId: session.id,
            state: session.state,
            userId: session.userId,
            player: session.player,
            startTime: session.startTime,
          }),
        );
      } else if (type === 'episode') {
        return Array.from(this.allActiveSessions.episodes.values()).map(
          (session) => ({
            ...session.episode,
            sessionId: session.id,
            state: session.state,
            userId: session.userId,
            player: session.player,
            startTime: session.startTime,
          }),
        );
      } else if (type === 'all') {
        return {
          tracks: Array.from(this.allActiveSessions.tracks.values()).map(
            (session) => ({
              ...session.track,
              sessionId: session.id,
              state: session.state,
              userId: session.userId,
              player: session.player,
              startTime: session.startTime,
            }),
          ),
          movies: Array.from(this.allActiveSessions.movies.values()).map(
            (session) => ({
              ...session.movie,
              sessionId: session.id,
              state: session.state,
              userId: session.userId,
              player: session.player,
              startTime: session.startTime,
            }),
          ),
          episodes: Array.from(this.allActiveSessions.episodes.values()).map(
            (session) => ({
              ...session.episode,
              sessionId: session.id,
              state: session.state,
              userId: session.userId,
              player: session.player,
              startTime: session.startTime,
            }),
          ),
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
