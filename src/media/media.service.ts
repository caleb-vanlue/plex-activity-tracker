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

  async getCurrentMedia(type: string): Promise<any> {
    if (type === 'all') {
      return {
        track: this.mediaEventService.getCurrentMedia('track'),
        movie: this.mediaEventService.getCurrentMedia('movie'),
        episode: this.mediaEventService.getCurrentMedia('episode'),
      };
    }
    return this.mediaEventService.getCurrentMedia(type);
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

  async getRecentTracks(limit: number = 10): Promise<any[]> {
    return this.trackRepository.findRecent(limit);
  }

  async getTracksByArtist(artist: string, limit: number = 10): Promise<any[]> {
    return this.trackRepository.findByArtist(artist, limit);
  }

  async getTracksByAlbum(album: string, limit: number = 10): Promise<any[]> {
    return this.trackRepository.findByAlbum(album, limit);
  }

  async getTracksByState(state: string, limit: number = 10): Promise<any[]> {
    return this.trackRepository.findByState(state, limit);
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.trackRepository.getListeningStats(timeframe);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.trackRepository.getTopAlbums(timeframe);
  }

  async getRecentMovies(limit: number = 10): Promise<any[]> {
    return this.movieRepository.findRecent(limit);
  }

  async getMoviesByDirector(
    director: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.movieRepository.findByDirector(director, limit);
  }

  async getMoviesByStudio(studio: string, limit: number = 10): Promise<any[]> {
    return this.movieRepository.findByStudio(studio, limit);
  }

  async getMoviesByState(state: string, limit: number = 10): Promise<any[]> {
    return this.movieRepository.findByState(state, limit);
  }

  async getMovieWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.movieRepository.getWatchingStats(timeframe);
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.movieRepository.getTopDirectors(timeframe);
  }

  async getRecentEpisodes(limit: number = 10): Promise<any[]> {
    return this.episodeRepository.findRecent(limit);
  }

  async getEpisodesByShow(
    showTitle: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.episodeRepository.findByShow(showTitle, limit);
  }

  async getEpisodesBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
  ): Promise<any[]> {
    return this.episodeRepository.findBySeason(showTitle, season, limit);
  }

  async getEpisodesByState(state: string, limit: number = 10): Promise<any[]> {
    return this.episodeRepository.findByState(state, limit);
  }

  async getTVWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.episodeRepository.getWatchingStats(timeframe);
  }

  async getShowsInProgress(): Promise<any> {
    return this.episodeRepository.getShowsInProgress();
  }

  async getStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
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
