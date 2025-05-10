import { Episode } from '../entities/episode.entity';
import { Movie } from '../entities/movie.entity';
import { Track } from '../entities/track.entity';

export type MediaType = 'track' | 'movie' | 'episode';
export type SessionState = 'playing' | 'paused' | 'stopped';

export interface MediaSession {
  id: string;
  userId: string;
  mediaType: MediaType;
  mediaId: string;
  state: SessionState;
  startTime: Date;
  endTime?: Date | null;
  timeWatchedMs: number;
  player?: string | null;

  track?: Track | null;
  movie?: Movie | null;
  episode?: Episode | null;
}
