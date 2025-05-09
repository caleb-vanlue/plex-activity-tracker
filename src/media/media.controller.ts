import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('media')
@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private mediaService: MediaService) {}

  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Type of media to fetch (e.g., all, track, movie, episode)',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by specific user',
  })
  @Get('current')
  async getCurrentMedia(
    @Query('type') type: string = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getCurrentMedia(type, user);
  }

  @Get('users/active')
  async getActiveUsers() {
    return { users: await this.mediaService.getActiveUsers() };
  }

  @ApiQuery({
    name: 'limit',
    required: true,
    type: Number,
    default: 10,
    description: 'Number of items to return',
  })
  @ApiQuery({
    name: 'artist',
    required: false,
    type: String,
    description: 'Filter by artist',
  })
  @ApiQuery({
    name: 'album',
    required: false,
    type: String,
    description: 'Filter by album',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Filter by state',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('tracks')
  async getTracks(
    @Query('limit') limit: number = 10,
    @Query('artist') artist?: string,
    @Query('album') album?: string,
    @Query('state') state?: string,
    @Query('user') user?: string,
  ) {
    this.logger.debug(
      `Fetching tracks with limit: ${limit}, filters: ${JSON.stringify({ artist, album, state, user })}`,
    );

    if (artist) {
      return this.mediaService.getTracksByArtist(artist, limit, user);
    }

    if (album) {
      return this.mediaService.getTracksByAlbum(album, limit, user);
    }

    if (state && state !== 'all') {
      return this.mediaService.getTracksByState(state, limit, user);
    }

    return this.mediaService.getRecentTracks(limit, user);
  }

  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the track to fetch',
  })
  @Get('tracks/:id')
  async getTrackById(@Param('id') id: string) {
    const track = await this.mediaService.getMediaById('track', id);
    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return track;
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('music/stats')
  async getMusicStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getListeningStats(timeframe, user);
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('music/artists')
  async getTopArtists(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getListeningStats(timeframe, user);
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('music/albums')
  async getTopAlbums(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getTopAlbums(timeframe, user);
  }

  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 10,
    description: 'Number of items to return',
  })
  @ApiQuery({
    name: 'director',
    required: false,
    type: String,
    description: 'Filter by director',
  })
  @ApiQuery({
    name: 'studio',
    required: false,
    type: String,
    description: 'Filter by studio',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Filter by state',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('movies')
  async getMovies(
    @Query('limit') limit: number = 10,
    @Query('director') director?: string,
    @Query('studio') studio?: string,
    @Query('state') state?: string,
    @Query('user') user?: string,
  ) {
    this.logger.debug(
      `Fetching movies with limit: ${limit}, filters: ${JSON.stringify({ director, studio, state, user })}`,
    );

    if (director) {
      return this.mediaService.getMoviesByDirector(director, limit, user);
    }

    if (studio) {
      return this.mediaService.getMoviesByStudio(studio, limit, user);
    }

    if (state && state !== 'all') {
      return this.mediaService.getMoviesByState(state, limit, user);
    }

    return this.mediaService.getRecentMovies(limit, user);
  }

  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the movie to fetch',
  })
  @Get('movies/:id')
  async getMovieById(@Param('id') id: string) {
    const movie = await this.mediaService.getMediaById('movie', id);
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('movies/stats')
  async getMovieStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getMovieWatchingStats(timeframe, user);
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('movies/directors')
  async getTopDirectors(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getTopDirectors(timeframe, user);
  }

  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 10,
    description: 'Number of items to return',
  })
  @ApiQuery({
    name: 'show',
    required: false,
    type: String,
    description: 'Filter by show name',
  })
  @ApiQuery({
    name: 'season',
    required: false,
    type: Number,
    description: 'Filter by season number',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Filter by state',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('tv/episodes')
  async getEpisodes(
    @Query('limit') limit: number = 10,
    @Query('show') show?: string,
    @Query('season') season?: number,
    @Query('state') state?: string,
    @Query('user') user?: string,
  ) {
    this.logger.debug(
      `Fetching episodes with limit: ${limit}, filters: ${JSON.stringify({ show, season, state, user })}`,
    );

    if (show && season) {
      return this.mediaService.getEpisodesBySeason(show, season, limit, user);
    }

    if (show) {
      return this.mediaService.getEpisodesByShow(show, limit, user);
    }

    if (state && state !== 'all') {
      return this.mediaService.getEpisodesByState(state, limit, user);
    }

    return this.mediaService.getRecentEpisodes(limit, user);
  }

  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the episode to fetch',
  })
  @Get('tv/episodes/:id')
  async getEpisodeById(@Param('id') id: string) {
    const episode = await this.mediaService.getMediaById('episode', id);
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }
    return episode;
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('tv/stats')
  async getTVStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getTVWatchingStats(timeframe, user);
  }

  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('tv/shows')
  async getShowsInProgress(@Query('user') user?: string) {
    return this.mediaService.getShowsInProgress(user);
  }

  @ApiQuery({
    name: 'timeframe',
    required: false,
    type: String,
    enum: ['day', 'week', 'month', 'all'],
    default: 'all',
    description: 'Timeframe for the stats',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user',
  })
  @Get('stats')
  async getAllStats(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('user') user?: string,
  ) {
    return this.mediaService.getStats(timeframe, user);
  }
}
