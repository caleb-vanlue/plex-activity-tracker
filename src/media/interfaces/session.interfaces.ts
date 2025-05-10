import { BaseRepository } from 'src/common/interfaces/repository.interfaces';
import { ObjectLiteral } from 'typeorm';
import { Episode } from '../entities/episode.entity';
import { Movie } from '../entities/movie.entity';
import { Track } from '../entities/track.entity';
import { MediaType } from 'src/common/interfaces/media.interfaces';

export type SessionState = 'playing' | 'paused' | 'stopped';

export interface MediaSession extends ObjectLiteral {
  id: string;
  userId: string;
  mediaType: MediaType;
  mediaId: string;
  state: SessionState;
  startTime: Date;
  endTime?: Date;
  timeWatchedMs: number;
  player?: string;

  track?: Track;
  movie?: Movie;
  episode?: Episode;
}

export interface ActiveSessions {
  tracks: Map<string, MediaSession>;
  movies: Map<string, MediaSession>;
  episodes: Map<string, MediaSession>;
}

export interface SessionRepository extends BaseRepository<MediaSession> {
  findActive(
    userId: string,
    mediaType: MediaType,
    mediaId?: string,
  ): Promise<MediaSession | null>;
  findAllActiveTracks(userId: string): Promise<MediaSession[]>;
  findAllActiveMovies(userId: string): Promise<MediaSession[]>;
  findAllActiveEpisodes(userId: string): Promise<MediaSession[]>;
  findAllActive(): Promise<MediaSession[]>;
  findRecentSessions(
    mediaType: MediaType,
    limit?: number,
    userId?: string,
  ): Promise<MediaSession[]>;
}
