import { Injectable } from '@nestjs/common';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { MediaEventService } from './media-event.service';

@Injectable()
export class MediaService {
  constructor(
    private trackRepository: TrackRepository,
    private movieRepository: MovieRepository,
    private episodeRepository: EpisodeRepository,
    private mediaEventService: MediaEventService,
  ) {}

  async getCurrentMedia(type: string, user?: string): Promise<any> {
    return this.mediaEventService.getCurrentMedia(type, user);
  }

  async getActiveUsers(): Promise<string[]> {
    return this.mediaEventService.getActiveUsers();
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

  async getRecentTracks(limit: number = 10, user?: string): Promise<any[]> {
    return user
      ? this.trackRepository.findByUser(user, limit)
      : this.trackRepository.findRecent(limit);
  }

  async getTracksByArtist(
    artist: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackRepository.findByArtistAndUser(artist, user, limit)
      : this.trackRepository.findByArtist(artist, limit);
  }

  async getTracksByAlbum(
    album: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackRepository.findByAlbumAndUser(album, user, limit)
      : this.trackRepository.findByAlbum(album, limit);
  }

  async getTracksByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.trackRepository.findByStateAndUser(state, user, limit)
      : this.trackRepository.findByState(state, limit);
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.trackRepository.getUserListeningStats(user, timeframe)
      : this.trackRepository.getListeningStats(timeframe);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.trackRepository.getUserTopAlbums(user, timeframe)
      : this.trackRepository.getTopAlbums(timeframe);
  }

  async getRecentMovies(limit: number = 10, user?: string): Promise<any[]> {
    return user
      ? this.movieRepository.findByUser(user, limit)
      : this.movieRepository.findRecent(limit);
  }

  async getMoviesByDirector(
    director: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieRepository.findByDirectorAndUser(director, user, limit)
      : this.movieRepository.findByDirector(director, limit);
  }

  async getMoviesByStudio(
    studio: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieRepository.findByStudioAndUser(studio, user, limit)
      : this.movieRepository.findByStudio(studio, limit);
  }

  async getMoviesByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.movieRepository.findByStateAndUser(state, user, limit)
      : this.movieRepository.findByState(state, limit);
  }

  async getMovieWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.movieRepository.getUserWatchingStats(user, timeframe)
      : this.movieRepository.getWatchingStats(timeframe);
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.movieRepository.getUserTopDirectors(user, timeframe)
      : this.movieRepository.getTopDirectors(timeframe);
  }

  async getRecentEpisodes(limit: number = 10, user?: string): Promise<any[]> {
    return user
      ? this.episodeRepository.findByUser(user, limit)
      : this.episodeRepository.findRecent(limit);
  }

  async getEpisodesByShow(
    showTitle: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeRepository.findByShowAndUser(showTitle, user, limit)
      : this.episodeRepository.findByShow(showTitle, limit);
  }

  async getEpisodesBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeRepository.findBySeasonAndUser(
          showTitle,
          season,
          user,
          limit,
        )
      : this.episodeRepository.findBySeason(showTitle, season, limit);
  }

  async getEpisodesByState(
    state: string,
    limit: number = 10,
    user?: string,
  ): Promise<any[]> {
    return user
      ? this.episodeRepository.findByStateAndUser(state, user, limit)
      : this.episodeRepository.findByState(state, limit);
  }

  async getTVWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    return user
      ? this.episodeRepository.getUserWatchingStats(user, timeframe)
      : this.episodeRepository.getWatchingStats(timeframe);
  }

  async getShowsInProgress(user?: string): Promise<any> {
    return user
      ? this.episodeRepository.getUserShowsInProgress(user)
      : this.episodeRepository.getShowsInProgress();
  }

  async getStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    user?: string,
  ): Promise<any> {
    if (user) {
      const [musicStats, movieStats, tvStats] = await Promise.all([
        this.getListeningStats(timeframe, user),
        this.getMovieWatchingStats(timeframe, user),
        this.getTVWatchingStats(timeframe, user),
      ]);

      return {
        user,
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      };
    } else {
      const [musicStats, movieStats, tvStats] = await Promise.all([
        this.getListeningStats(timeframe),
        this.getMovieWatchingStats(timeframe),
        this.getTVWatchingStats(timeframe),
      ]);

      return {
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      };
    }
  }
}
