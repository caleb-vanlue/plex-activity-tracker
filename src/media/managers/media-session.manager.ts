import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';

@Injectable()
export class MediaSessionManager {
  private readonly logger = new Logger(MediaSessionManager.name);

  private userSessions: Map<
    string,
    {
      tracks: Map<string, any>;
      movies: Map<string, any>;
      episodes: Map<string, any>;
    }
  > = new Map();

  private allActiveSessions: {
    tracks: Map<string, any>;
    movies: Map<string, any>;
    episodes: Map<string, any>;
  } = {
    tracks: new Map(),
    movies: new Map(),
    episodes: new Map(),
  };

  constructor(
    private userMediaSessionRepository: UserMediaSessionRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async initialize(): Promise<void> {
    const activeSessions =
      await this.userMediaSessionRepository.findAllActive();

    for (const session of activeSessions) {
      this.addSession(session);
    }

    this.logger.log('Media session manager initialized with active sessions');

    this.eventEmitter.on('plex.trackEvent', (eventData) => {
      this.logger.debug(`Handling track event: ${JSON.stringify(eventData)}`);
      this.handleMediaEvent(eventData, 'track');
    });

    this.eventEmitter.on('plex.videoEvent', (eventData) => {
      this.logger.debug(`Handling video event: ${JSON.stringify(eventData)}`);
      const mediaType = eventData.type === 'episode' ? 'episode' : 'movie';
      this.handleMediaEvent(eventData, mediaType);
    });
  }

  private async handleMediaEvent(
    eventData: any,
    mediaType: string,
  ): Promise<void> {
    const { sessionId, state, userId } = eventData;

    if (state === 'stopped') {
      this.removeSession(userId, mediaType, sessionId);
    } else {
      const session = await this.userMediaSessionRepository.findById(sessionId);
      if (session) {
        this.updateSession(session);
      } else {
        this.logger.warn(
          `Session with ID ${sessionId} not found for user ${userId}`,
        );
      }
    }
  }

  addSession(session: any): void {
    const userId = session.userId;
    const mediaType = session.mediaType;

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        tracks: new Map(),
        movies: new Map(),
        episodes: new Map(),
      });
    }

    const userSession = this.userSessions.get(userId);
    if (!userSession) {
      this.logger.warn(`User session not found for userId: ${userId}`);
      return;
    }

    if (mediaType === 'track' && session.track) {
      userSession.tracks.set(session.id, session);
      this.allActiveSessions.tracks.set(session.id, session);
    } else if (mediaType === 'movie' && session.movie) {
      userSession.movies.set(session.id, session);
      this.allActiveSessions.movies.set(session.id, session);
    } else if (mediaType === 'episode' && session.episode) {
      userSession.episodes.set(session.id, session);
      this.allActiveSessions.episodes.set(session.id, session);
    }
  }

  removeSession(userId: string, mediaType: string, sessionId: string): void {
    const userSession = this.userSessions.get(userId);
    if (!userSession) {
      return;
    }

    if (mediaType === 'track') {
      userSession.tracks.delete(sessionId);
      this.allActiveSessions.tracks.delete(sessionId);
    } else if (mediaType === 'movie') {
      userSession.movies.delete(sessionId);
      this.allActiveSessions.movies.delete(sessionId);
    } else if (mediaType === 'episode') {
      userSession.episodes.delete(sessionId);
      this.allActiveSessions.episodes.delete(sessionId);
    }
  }

  updateSession(session: any): void {
    if (session.state === 'stopped') {
      this.removeSession(session.userId, session.mediaType, session.id);
    } else {
      this.addSession(session);
    }
  }

  getCurrentMedia(type: string, userId?: string): any {
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

  getActiveUsers(): string[] {
    return Array.from(this.userSessions.keys());
  }

  getSessionCount(): {
    total: number;
    tracks: number;
    movies: number;
    episodes: number;
  } {
    return {
      total:
        this.allActiveSessions.tracks.size +
        this.allActiveSessions.movies.size +
        this.allActiveSessions.episodes.size,
      tracks: this.allActiveSessions.tracks.size,
      movies: this.allActiveSessions.movies.size,
      episodes: this.allActiveSessions.episodes.size,
    };
  }
}
