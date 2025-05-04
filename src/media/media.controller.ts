import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private mediaService: MediaService) {}

  @Get('current')
  async getCurrentMedia(@Query('type') type: string = 'all') {
    return this.mediaService.getCurrentMedia(type);
  }

  @Get('tracks')
  async getTracks(
    @Query('limit') limit: number = 10,
    @Query('artist') artist?: string,
    @Query('album') album?: string,
    @Query('state') state?: string,
  ) {
    this.logger.debug(
      `Fetching tracks with limit: ${limit}, filters: ${JSON.stringify({ artist, album, state })}`,
    );

    if (artist) {
      return this.mediaService.getTracksByArtist(artist, limit);
    }

    if (album) {
      return this.mediaService.getTracksByAlbum(album, limit);
    }

    if (state && state !== 'all') {
      return this.mediaService.getTracksByState(state, limit);
    }

    return this.mediaService.getRecentTracks(limit);
  }

  @Get('tracks/:id')
  async getTrackById(@Param('id') id: string) {
    const track = await this.mediaService.getMediaById('track', id);
    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return track;
  }

  @Get('music/stats')
  async getMusicStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getListeningStats(timeframe);
  }

  @Get('music/artists')
  async getTopArtists(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getListeningStats(timeframe);
  }

  @Get('music/albums')
  async getTopAlbums(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getTopAlbums(timeframe);
  }

  @Get('movies')
  async getMovies(
    @Query('limit') limit: number = 10,
    @Query('director') director?: string,
    @Query('studio') studio?: string,
    @Query('state') state?: string,
  ) {
    this.logger.debug(
      `Fetching movies with limit: ${limit}, filters: ${JSON.stringify({ director, studio, state })}`,
    );

    if (director) {
      return this.mediaService.getMoviesByDirector(director, limit);
    }

    if (studio) {
      return this.mediaService.getMoviesByStudio(studio, limit);
    }

    if (state && state !== 'all') {
      return this.mediaService.getMoviesByState(state, limit);
    }

    return this.mediaService.getRecentMovies(limit);
  }

  @Get('movies/:id')
  async getMovieById(@Param('id') id: string) {
    const movie = await this.mediaService.getMediaById('movie', id);
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  @Get('movies/stats')
  async getMovieStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getMovieWatchingStats(timeframe);
  }

  @Get('movies/directors')
  async getTopDirectors(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getTopDirectors(timeframe);
  }

  @Get('tv/episodes')
  async getEpisodes(
    @Query('limit') limit: number = 10,
    @Query('show') show?: string,
    @Query('season') season?: number,
    @Query('state') state?: string,
  ) {
    this.logger.debug(
      `Fetching episodes with limit: ${limit}, filters: ${JSON.stringify({ show, season, state })}`,
    );

    if (show && season) {
      return this.mediaService.getEpisodesBySeason(show, season, limit);
    }

    if (show) {
      return this.mediaService.getEpisodesByShow(show, limit);
    }

    if (state && state !== 'all') {
      return this.mediaService.getEpisodesByState(state, limit);
    }

    return this.mediaService.getRecentEpisodes(limit);
  }

  @Get('tv/episodes/:id')
  async getEpisodeById(@Param('id') id: string) {
    const episode = await this.mediaService.getMediaById('episode', id);
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }
    return episode;
  }

  @Get('tv/stats')
  async getTVStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getTVWatchingStats(timeframe);
  }

  @Get('tv/shows')
  async getShowsInProgress() {
    return this.mediaService.getShowsInProgress();
  }

  @Get('stats')
  async getAllStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ) {
    return this.mediaService.getStats(timeframe);
  }
}
