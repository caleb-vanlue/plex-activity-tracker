import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private userMediaSessionRepository: UserMediaSessionRepository) {}

  async initialize(): Promise<void> {
    const activeSessions =
      await this.userMediaSessionRepository.findAllActive();

    for (const session of activeSessions) {
      this.addSession(session);
    }

    this.logger.log('Media session manager initialized with active sessions');
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
    // If state is stopped, remove the session
    if (session.state === 'stopped') {
      this.removeSession(session.userId, session.mediaType, session.id);
    } else {
      // Otherwise update the session
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
}
