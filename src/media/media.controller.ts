import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiParam, ApiQuery, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentMediaDto } from '../common/dto/current-media.dto';
import { StatsQueryDto } from '../common/dto/stats-query.dto';
import { TrackQueryDto } from './dto/track-query.dto';
import { MovieQueryDto } from './dto/movie-query.dto';
import { EpisodeQueryDto } from './dto/episode-query.dto';

@ApiTags('media')
@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private mediaService: MediaService) {}

  @ApiOperation({ summary: 'Get currently playing media' })
  @Get('current')
  async getCurrentMedia(@Query() query: CurrentMediaDto) {
    return this.mediaService.getCurrentMedia(query.type || 'all', query.user);
  }

  @ApiOperation({ summary: 'Get active users' })
  @Get('users/active')
  async getActiveUsers() {
    return { users: await this.mediaService.getActiveUsers() };
  }

  @ApiOperation({ summary: 'Get tracks with optional filtering' })
  @Get('tracks')
  async getTracks(@Query() query: TrackQueryDto) {
    this.logger.debug(`Fetching tracks with query: ${JSON.stringify(query)}`);

    if (query.artist) {
      return this.mediaService.getTracksByArtist(
        query.artist,
        query.limit,
        query.user,
      );
    }

    if (query.album) {
      return this.mediaService.getTracksByAlbum(
        query.album,
        query.limit,
        query.user,
      );
    }

    if (query.state && query.state !== 'all') {
      return this.mediaService.getTracksByState(
        query.state,
        query.limit,
        query.user,
      );
    }

    return this.mediaService.getRecentTracks(query.limit, query.user);
  }

  @ApiOperation({ summary: 'Get track by ID' })
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

  @ApiOperation({ summary: 'Get music statistics' })
  @Get('music/stats')
  async getMusicStats(@Query() query: StatsQueryDto) {
    return this.mediaService.getListeningStats(
      query.timeframe || 'all',
      query.user,
    );
  }

  @ApiOperation({ summary: 'Get top artists' })
  @Get('music/artists')
  async getTopArtists(@Query() query: StatsQueryDto) {
    return this.mediaService.getTopArtists(
      query.timeframe || 'all',
      query.user,
    );
  }

  @ApiOperation({ summary: 'Get top albums' })
  @Get('music/albums')
  async getTopAlbums(@Query() query: StatsQueryDto) {
    return this.mediaService.getTopAlbums(query.timeframe || 'all', query.user);
  }

  @ApiOperation({ summary: 'Get movies with optional filtering' })
  @Get('movies')
  async getMovies(@Query() query: MovieQueryDto) {
    this.logger.debug(`Fetching movies with query: ${JSON.stringify(query)}`);

    if (query.director) {
      return this.mediaService.getMoviesByDirector(
        query.director,
        query.limit,
        query.user,
      );
    }

    if (query.studio) {
      return this.mediaService.getMoviesByStudio(
        query.studio,
        query.limit,
        query.user,
      );
    }

    if (query.state && query.state !== 'all') {
      return this.mediaService.getMoviesByState(
        query.state,
        query.limit,
        query.user,
      );
    }

    return this.mediaService.getRecentMovies(query.limit, query.user);
  }

  @ApiOperation({ summary: 'Get movie by ID' })
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

  @ApiOperation({ summary: 'Get movie statistics' })
  @Get('movies/stats')
  async getMovieStats(@Query() query: StatsQueryDto) {
    return this.mediaService.getMovieWatchingStats(
      query.timeframe || 'all',
      query.user,
    );
  }

  @ApiOperation({ summary: 'Get top directors' })
  @Get('movies/directors')
  async getTopDirectors(@Query() query: StatsQueryDto) {
    return this.mediaService.getTopDirectors(
      query.timeframe || 'all',
      query.user,
    );
  }

  @ApiOperation({ summary: 'Get TV episodes with optional filtering' })
  @Get('tv/episodes')
  async getEpisodes(@Query() query: EpisodeQueryDto) {
    this.logger.debug(`Fetching episodes with query: ${JSON.stringify(query)}`);

    if (query.show && query.season) {
      return this.mediaService.getEpisodesBySeason(
        query.show,
        query.season,
        query.limit,
        query.user,
      );
    }

    if (query.show) {
      return this.mediaService.getEpisodesByShow(
        query.show,
        query.limit,
        query.user,
      );
    }

    if (query.state && query.state !== 'all') {
      return this.mediaService.getEpisodesByState(
        query.state,
        query.limit,
        query.user,
      );
    }

    return this.mediaService.getRecentEpisodes(query.limit, query.user);
  }

  @ApiOperation({ summary: 'Get TV episode by ID' })
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

  @ApiOperation({ summary: 'Get TV watching statistics' })
  @Get('tv/stats')
  async getTVStats(@Query() query: StatsQueryDto) {
    return this.mediaService.getTVWatchingStats(
      query.timeframe || 'all',
      query.user,
    );
  }

  @ApiOperation({ summary: 'Get shows in progress' })
  @Get('tv/shows')
  async getShowsInProgress(@Query('user') user?: string) {
    return this.mediaService.getShowsInProgress(user);
  }

  @ApiOperation({ summary: 'Get aggregated statistics for all media types' })
  @Get('stats')
  async getAllStats(@Query() query: StatsQueryDto) {
    return this.mediaService.getStats(query.timeframe || 'all', query.user);
  }
}
