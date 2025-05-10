import { Injectable } from '@nestjs/common';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { TrackStatsRepository } from './repositories/track-stats.repository';
import { MovieStatsRepository } from './repositories/movie-stats.repository';
import { EpisodeStatsRepository } from './repositories/episode-stats.repository';
import { CombinedStatsRepository } from './repositories/combined-stats.repository';
import { UserMediaSessionRepository } from './repositories/user-media-session.repository';
import { MediaEventService } from './media-event.service';
import { UserRepository } from './repositories/user.repository';
import { MediaSessionManager } from './managers/media-session.manager';

@Injectable()
export class MediaService {
  constructor(
    private trackRepository: TrackRepository,
    private movieRepository: MovieRepository,
    private episodeRepository: EpisodeRepository,
    private trackStatsRepository: TrackStatsRepository,
    private movieStatsRepository: MovieStatsRepository,
    private episodeStatsRepository: EpisodeStatsRepository,
    private combinedStatsRepository: CombinedStatsRepository,
    private userMediaSessionRepository: UserMediaSessionRepository,
    private userRepository: UserRepository,
    private mediaSessionManager: MediaSessionManager,
  ) {}

  // Use session manager for current media
  async getCurrentMedia(type: string, user?: string): Promise<any> {
    return this.mediaSessionManager.getCurrentMedia(type, user);
  }

  // Use session manager for active users
  async getActiveUsers(): Promise<string[]> {
    return this.mediaSessionManager.getActiveUsers();
  }

  async getActiveUsersDetails(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    return this.combinedStatsRepository.getActiveUsersStats(timeframe);
  }

  async getMediaById(type: string, id: string): Promise<any> {
    switch (type) {
      case 'track':
        return this.trackRepository.findById(id);
      case 'movie':
        return this.movieRepository.findById(id);
      case 'episode':
        return this.episodeRepository.findById(id);
      default:
        return null;
    }
  }

  async getMediaSessionById(id: string): Promise<any> {
    return this.userMediaSessionRepository.findById(id);
  }

  async getRecentTracks(limit: number = 10, user?: string): Promise<any[]> {
    if (user) {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'track',
        limit,
        user,
      );

      return sessions.map((session) => ({
        ...session.track,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
      }));
    } else {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'track',
        limit,
      );

      return sessions.map((session) => ({
        ...session.track,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
        userId: session.userId,
      }));
    }
  }

  async getTracksByArtist(
    artist: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackStatsRepository.findByArtistAndUser(artist, user, limit)
      : this.trackStatsRepository.findByArtist(artist, limit);
  }

  async getTracksByAlbum(
    album: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackStatsRepository.findByAlbumAndUser(album, user, limit)
      : this.trackStatsRepository.findByAlbum(album, limit);
  }

  async getTracksByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    const query = this.userMediaSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .where('session.mediaType = :mediaType', { mediaType: 'track' })
      .andWhere('session.state = :state', { state });

    if (user) {
      query.andWhere('session.userId = :userId', { userId: user });
    }

    const sessions = await query
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();

    return sessions.map((session) => ({
      ...session.track,
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      state: session.state,
      timeWatchedMs: session.timeWatchedMs,
      userId: user ? undefined : session.userId,
    }));
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.trackStatsRepository.getUserListeningStats(user, timeframe)
      : this.trackStatsRepository.getListeningStats(timeframe);
  }

  async getTopArtists(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackStatsRepository.getUserTopArtists(user, timeframe)
      : this.trackStatsRepository.getTopArtists(timeframe);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackStatsRepository.getUserTopAlbums(user, timeframe)
      : this.trackStatsRepository.getTopAlbums(timeframe);
  }

  async getRecentMovies(limit: number = 10, user?: string): Promise<any[]> {
    if (user) {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'movie',
        limit,
        user,
      );

      return sessions.map((session) => ({
        ...session.movie,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
      }));
    } else {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'movie',
        limit,
      );

      return sessions.map((session) => ({
        ...session.movie,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
        userId: session.userId,
      }));
    }
  }

  async getMoviesByDirector(
    director: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieStatsRepository.findByDirectorAndUser(director, user, limit)
      : this.movieStatsRepository.findByDirector(director, limit);
  }

  async getMoviesByStudio(
    studio: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieStatsRepository.findByStudioAndUser(studio, user, limit)
      : this.movieStatsRepository.findByStudio(studio, limit);
  }

  async getMoviesByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    const query = this.userMediaSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.movie', 'movie')
      .where('session.mediaType = :mediaType', { mediaType: 'movie' })
      .andWhere('session.state = :state', { state });

    if (user) {
      query.andWhere('session.userId = :userId', { userId: user });
    }

    const sessions = await query
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();

    return sessions.map((session) => ({
      ...session.movie,
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      state: session.state,
      timeWatchedMs: session.timeWatchedMs,
      userId: user ? undefined : session.userId,
    }));
  }

  async getMovieWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.movieStatsRepository.getUserWatchingStats(user, timeframe)
      : this.movieStatsRepository.getWatchingStats(timeframe);
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieStatsRepository.getUserTopDirectors(user, timeframe)
      : this.movieStatsRepository.getTopDirectors(timeframe);
  }

  async getRecentEpisodes(limit: number = 10, user?: string): Promise<any[]> {
    if (user) {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'episode',
        limit,
        user,
      );

      return sessions.map((session) => ({
        ...session.episode,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
      }));
    } else {
      const sessions = await this.userMediaSessionRepository.findRecentSessions(
        'episode',
        limit,
      );

      return sessions.map((session) => ({
        ...session.episode,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        state: session.state,
        timeWatchedMs: session.timeWatchedMs,
        userId: session.userId,
      }));
    }
  }

  async getEpisodesByShow(
    showTitle: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeStatsRepository.findByShowAndUser(showTitle, user, limit)
      : this.episodeStatsRepository.findByShow(showTitle, limit);
  }

  async getEpisodesBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeStatsRepository.findBySeasonAndUser(
          showTitle,
          season,
          user,
          limit,
        )
      : this.episodeStatsRepository.findBySeason(showTitle, season, limit);
  }

  async getEpisodesByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    const query = this.userMediaSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.mediaType = :mediaType', { mediaType: 'episode' })
      .andWhere('session.state = :state', { state });

    if (user) {
      query.andWhere('session.userId = :userId', { userId: user });
    }

    const sessions = await query
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();

    return sessions.map((session) => ({
      ...session.episode,
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      state: session.state,
      timeWatchedMs: session.timeWatchedMs,
      userId: user ? undefined : session.userId,
    }));
  }

  async getTVWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.episodeStatsRepository.getUserWatchingStats(user, timeframe)
      : this.episodeStatsRepository.getWatchingStats(timeframe);
  }

  async getTopShows(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeStatsRepository.getUserTopShows(user, timeframe)
      : this.episodeStatsRepository.getTopShows(timeframe);
  }

  async getShowsInProgress(user?: string): Promise<any> {
    return user
      ? this.episodeStatsRepository.getUserShowsInProgress(user)
      : this.episodeStatsRepository.getShowsInProgress();
  }

  async getStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    if (user) {
      return this.combinedStatsRepository.getUserStats(user, timeframe);
    } else {
      return this.combinedStatsRepository.getOverallStats(timeframe);
    }
  }

  async compareUsers(
    userIds: string[],
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.combinedStatsRepository.compareUsers(userIds, timeframe);
  }

  async getTrendingMedia(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.combinedStatsRepository.getTrendingMedia(timeframe);
  }

  async getUserById(id: string): Promise<any> {
    return this.userRepository.findById(id);
  }

  async getAllUsers(): Promise<any[]> {
    return this.userRepository.findAll();
  }

  async getUserSessionsHistory(
    userId: string,
    mediaType?: string,
    limit: number = 20,
  ): Promise<any[]> {
    const query = this.userMediaSessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    if (mediaType && ['track', 'movie', 'episode'].includes(mediaType)) {
      query.andWhere('session.mediaType = :mediaType', { mediaType });
      query.leftJoinAndSelect(`session.${mediaType}`, mediaType);
    } else {
      query
        .leftJoinAndSelect('session.track', 'track')
        .leftJoinAndSelect('session.movie', 'movie')
        .leftJoinAndSelect('session.episode', 'episode');
    }

    const sessions = await query
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();

    return sessions.map((session) => {
      let mediaDetails = {};

      if (session.mediaType === 'track' && session.track) {
        mediaDetails = {
          title: session.track.title,
          artist: session.track.artist,
          album: session.track.album,
        };
      } else if (session.mediaType === 'movie' && session.movie) {
        mediaDetails = {
          title: session.movie.title,
          year: session.movie.year,
          director: session.movie.director,
        };
      } else if (session.mediaType === 'episode' && session.episode) {
        mediaDetails = {
          title: session.episode.title,
          showTitle: session.episode.showTitle,
          season: session.episode.season,
          episode: session.episode.episode,
        };
      }

      return {
        id: session.id,
        mediaId: session.mediaId,
        mediaType: session.mediaType,
        state: session.state,
        startTime: session.startTime,
        endTime: session.endTime,
        timeWatchedMs: session.timeWatchedMs,
        player: session.player,
        ...mediaDetails,
      };
    });
  }

  async getMediaSessionStats(): Promise<any> {
    return this.mediaSessionManager.getSessionCount();
  }
}
