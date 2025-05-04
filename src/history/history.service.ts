import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Track } from './entities/track.entity';
import { Movie } from './entities/movie.entity';
import { Episode } from './entities/episode.entity';
import { EpisodeRepository } from './repositories/episode.repository';
import { MovieRepository } from './repositories/movie.repository';
import { TrackRepository } from './repositories/track.repository';

interface TrackEvent {
  eventType: string;
  ratingKey: string;
  title: string;
  artist: string;
  album: string;
  state: string;
  user: string;
  player: string;
  timestamp: string;
  thumbnailUrl: string;
  raw: any;
}

interface VideoEvent {
  eventType: string;
  ratingKey: string;
  title: string;
  type: 'movie' | 'episode';
  // Movie specific fields
  year?: number;
  director?: string;
  studio?: string;
  // Episode specific fields
  showTitle?: string;
  season?: number;
  episode?: number;
  // Common fields
  summary?: string;
  duration?: number;
  state: string;
  user: string;
  player: string;
  timestamp: string;
  thumbnailUrl: string;
  raw: any;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private currentTrack: Track | null = null;
  private currentMovie: Movie | null = null;
  private currentEpisode: Episode | null = null;

  constructor(
    private trackRepository: TrackRepository,
    private movieRepository: MovieRepository,
    private episodeRepository: EpisodeRepository,
  ) {}

  @OnEvent('plex.trackEvent')
  async handleTrackEvent(event: TrackEvent) {
    try {
      this.logger.debug(`Processing track event: ${event.eventType}`);

      let track = await this.trackRepository.findByRatingKey(event.ratingKey);

      const now = new Date();
      const timestamp = new Date(event.timestamp);

      if (!track) {
        track = await this.trackRepository.createTrack({
          ratingKey: event.ratingKey,
          title: event.title,
          artist: event.artist,
          album: event.album,
          state: event.state,
          user: event.user,
          player: event.player,
          startTime: timestamp,
          thumbnailPath: event.thumbnailUrl,
          rawData: event.raw,
        });

        this.logger.log(`Created new track: ${track.title} by ${track.artist}`);
      } else {
        const updates: Partial<Track> = {
          state: event.state,
        };

        if (
          (this.currentTrack?.id === track.id &&
            this.currentTrack?.state === 'playing' &&
            (event.state === 'stopped' || event.state === 'paused')) ||
          event.state === 'stopped'
        ) {
          if (track.startTime) {
            const endTime = timestamp;
            updates.endTime = endTime;

            const additionalListenedMs =
              endTime.getTime() -
              (track.endTime?.getTime() || track.startTime.getTime());

            updates.listenedMs = (track.listenedMs || 0) + additionalListenedMs;
          }
        }

        if (event.state === 'playing' && track.state !== 'playing') {
          updates.startTime = timestamp;
        }

        await this.trackRepository.updateTrack(track.id, updates);
        track = await this.trackRepository.findOne({ where: { id: track.id } });
      }

      if (event.state === 'playing') {
        this.currentTrack = track;
      } else if (this.currentTrack?.id === track?.id) {
        this.currentTrack = event.state === 'paused' ? track : null;
      }
    } catch (error) {
      this.logger.error(`Error handling track event: ${error.message}`);
    }
  }

  @OnEvent('plex.videoEvent')
  async handleVideoEvent(event: VideoEvent) {
    try {
      this.logger.debug(
        `Processing video event: ${event.eventType} for ${event.type} ${event.title}`,
      );

      if (event.type === 'movie') {
        await this.handleMovieEvent(event);
      } else if (event.type === 'episode') {
        await this.handleEpisodeEvent(event);
      }
    } catch (error) {
      this.logger.error(`Error handling video event: ${error.message}`);
    }
  }

  private async handleMovieEvent(event: VideoEvent) {
    let movie = await this.movieRepository.findByRatingKey(event.ratingKey);

    const now = new Date();
    const timestamp = new Date(event.timestamp);

    if (!movie) {
      movie = await this.movieRepository.createMovie({
        ratingKey: event.ratingKey,
        title: event.title,
        year: event.year,
        director: event.director,
        studio: event.studio,
        summary: event.summary,
        duration: event.duration,
        state: event.state,
        user: event.user,
        player: event.player,
        startTime: timestamp,
        thumbnailUrl: event.thumbnailUrl,
        raw: event.raw,
      });

      this.logger.log(`Created new movie: ${movie.title}`);
    } else {
      const updates: Partial<Movie> = {
        state: event.state,
      };

      if (
        (this.currentMovie?.id === movie.id &&
          this.currentMovie?.state === 'playing' &&
          (event.state === 'stopped' || event.state === 'paused')) ||
        event.state === 'stopped'
      ) {
        if (movie.startTime) {
          const endTime = timestamp;
          updates.endTime = endTime;

          const additionalWatchedMs =
            endTime.getTime() -
            (movie.endTime?.getTime() || movie.startTime.getTime());

          updates.watchedMs = (movie.watchedMs || 0) + additionalWatchedMs;

          if (movie.duration) {
            updates.percentComplete =
              ((movie.watchedMs || 0) + additionalWatchedMs) /
              (movie.duration * 1000);
          }
        }
      }

      if (event.state === 'playing' && movie.state !== 'playing') {
        updates.startTime = timestamp;
      }

      await this.movieRepository.updateMovie(movie.id, updates);
      movie = await this.movieRepository.findOne({ where: { id: movie.id } });
    }

    if (event.state === 'playing') {
      this.currentMovie = movie;
    } else if (this.currentMovie?.id === movie?.id) {
      this.currentMovie = event.state === 'paused' ? movie : null;
    }
  }

  private async handleEpisodeEvent(event: VideoEvent) {
    let episode = await this.episodeRepository.findByRatingKey(event.ratingKey);

    const now = new Date();
    const timestamp = new Date(event.timestamp);

    if (!episode) {
      episode = await this.episodeRepository.createEpisode({
        ratingKey: event.ratingKey,
        title: event.title,
        showTitle: event.showTitle,
        season: event.season,
        episode: event.episode,
        summary: event.summary,
        duration: event.duration,
        state: event.state,
        user: event.user,
        player: event.player,
        startTime: timestamp,
        thumbnailUrl: event.thumbnailUrl,
        raw: event.raw,
      });

      this.logger.log(
        `Created new episode: ${episode.title} (${episode.showTitle} S${episode.season}E${episode.episode})`,
      );
    } else {
      const updates: Partial<Episode> = {
        state: event.state,
      };

      if (
        (this.currentEpisode?.id === episode.id &&
          this.currentEpisode?.state === 'playing' &&
          (event.state === 'stopped' || event.state === 'paused')) ||
        event.state === 'stopped'
      ) {
        if (episode.startTime) {
          const endTime = timestamp;
          updates.endTime = endTime;

          const additionalWatchedMs =
            endTime.getTime() -
            (episode.endTime?.getTime() || episode.startTime.getTime());

          updates.watchedMs = (episode.watchedMs || 0) + additionalWatchedMs;

          if (episode.duration) {
            updates.percentComplete =
              ((episode.watchedMs || 0) + additionalWatchedMs) /
              (episode.duration * 1000);
          }
        }
      }

      if (event.state === 'playing' && episode.state !== 'playing') {
        updates.startTime = timestamp;
      }

      await this.episodeRepository.updateEpisode(episode.id, updates);
      episode = await this.episodeRepository.findOne({
        where: { id: episode.id },
      });
    }

    if (event.state === 'playing') {
      this.currentEpisode = episode;
    } else if (this.currentEpisode?.id === episode?.id) {
      this.currentEpisode = event.state === 'paused' ? episode : null;
    }
  }

  async getCurrentTrack(): Promise<Track | null> {
    return this.currentTrack;
  }

  async getRecentTracks(limit: number = 10): Promise<Track[]> {
    return this.trackRepository.findRecentTracks(limit);
  }

  async getTrackById(id: string): Promise<Track | null> {
    return this.trackRepository.findOne({ where: { id } });
  }

  async getTracksByArtist(
    artist: string,
    limit: number = 10,
  ): Promise<Track[]> {
    return this.trackRepository.findByArtist(artist, limit);
  }

  async getTracksByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.trackRepository.findByAlbum(album, limit);
  }

  async getTracksByState(state: string, limit: number = 10): Promise<Track[]> {
    return this.trackRepository.find({
      where: { state },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.trackRepository.getListeningStats(timeframe);
  }

  async getTopArtists(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.trackRepository.getListeningStats(timeframe);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const query = `
      SELECT 
        album,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${this.getTimeframeCondition(timeframe, 'startTime')}
      GROUP BY album
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `;

    return this.trackRepository.query(query);
  }

  async getCurrentMovie(): Promise<Movie | null> {
    return this.currentMovie;
  }

  async getRecentMovies(limit: number = 10): Promise<Movie[]> {
    return this.movieRepository.findRecentMovies(limit);
  }

  async getMovieById(id: string): Promise<Movie | null> {
    return this.movieRepository.findOne({ where: { id } });
  }

  async getMoviesByDirector(
    director: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    return this.movieRepository.findByDirector(director, limit);
  }

  async getMoviesByStudio(
    studio: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    return this.movieRepository.findByStudio(studio, limit);
  }

  async getMoviesByState(state: string, limit: number = 10): Promise<Movie[]> {
    return this.movieRepository.find({
      where: { state },
      order: { startTime: 'DESC' },
      take: limit,
    });
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

  async getCurrentEpisode(): Promise<Episode | null> {
    return this.currentEpisode;
  }

  async getRecentEpisodes(limit: number = 10): Promise<Episode[]> {
    return this.episodeRepository.findRecentEpisodes(limit);
  }

  async getEpisodeById(id: string): Promise<Episode | null> {
    return this.episodeRepository.findOne({ where: { id } });
  }

  async getEpisodesByShow(
    showTitle: string,
    limit: number = 10,
  ): Promise<Episode[]> {
    return this.episodeRepository.findByShow(showTitle, limit);
  }

  async getEpisodesBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
  ): Promise<Episode[]> {
    return this.episodeRepository.findBySeason(showTitle, season, limit);
  }

  async getEpisodesByState(
    state: string,
    limit: number = 10,
  ): Promise<Episode[]> {
    return this.episodeRepository.find({
      where: { state },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getTVWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    return this.episodeRepository.getWatchingStats(timeframe);
  }

  async getShowsInProgress(): Promise<any> {
    return this.episodeRepository.getShowsInProgress();
  }

  private getTimeframeCondition(
    timeframe: 'day' | 'week' | 'month' | 'all',
    fieldName: string,
  ): string {
    switch (timeframe) {
      case 'day':
        return `AND "${fieldName}" > NOW() - INTERVAL '1 day'`;
      case 'week':
        return `AND "${fieldName}" > NOW() - INTERVAL '7 days'`;
      case 'month':
        return `AND "${fieldName}" > NOW() - INTERVAL '30 days'`;
      default:
        return '';
    }
  }
}
