import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { HistoryService } from '../history/history.service';
import { StatsQueryDto } from '../history/dto/track-query.dto';
import { VideoQueryDto } from './dto/video-query.dto';

@Controller('video')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(private historyService: HistoryService) {}

  @Get('movies/current')
  async getCurrentMovie() {
    return this.historyService.getCurrentMovie();
  }

  @Get('movies')
  async getMovies(@Query() query: VideoQueryDto) {
    const { limit = 10, director, studio, state } = query;
    this.logger.debug(
      `Fetching movies with limit: ${limit}, filters: ${JSON.stringify({ director, studio, state })}`,
    );

    if (director) {
      return this.historyService.getMoviesByDirector(director, limit);
    }

    if (studio) {
      return this.historyService.getMoviesByStudio(studio, limit);
    }

    if (state && state !== 'all') {
      return this.historyService.getMoviesByState(state, limit);
    }

    return this.historyService.getRecentMovies(limit);
  }

  @Get('movies/:id')
  async getMovieById(@Param('id') id: string) {
    const movie = await this.historyService.getMovieById(id);
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  @Get('movies/stats')
  async getMovieStats(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    this.logger.debug(`Fetching movie stats for timeframe: ${timeframe}`);
    return this.historyService.getMovieWatchingStats(timeframe);
  }

  @Get('movies/top-directors')
  async getTopDirectors(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    return this.historyService.getTopDirectors(timeframe);
  }

  @Get('tv/current')
  async getCurrentEpisode() {
    return this.historyService.getCurrentEpisode();
  }

  @Get('tv/shows')
  async getShowsInProgress() {
    return this.historyService.getShowsInProgress();
  }

  @Get('tv/episodes')
  async getEpisodes(@Query() query: VideoQueryDto) {
    const { limit = 10, show, season, state } = query;
    this.logger.debug(
      `Fetching episodes with limit: ${limit}, filters: ${JSON.stringify({ show, season, state })}`,
    );

    if (show && season) {
      return this.historyService.getEpisodesBySeason(
        show,
        Number(season),
        limit,
      );
    }

    if (show) {
      return this.historyService.getEpisodesByShow(show, limit);
    }

    if (state && state !== 'all') {
      return this.historyService.getEpisodesByState(state, limit);
    }

    return this.historyService.getRecentEpisodes(limit);
  }

  @Get('tv/episodes/:id')
  async getEpisodeById(@Param('id') id: string) {
    const episode = await this.historyService.getEpisodeById(id);
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }
    return episode;
  }

  @Get('tv/stats')
  async getTVStats(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    this.logger.debug(`Fetching TV stats for timeframe: ${timeframe}`);
    return this.historyService.getTVWatchingStats(timeframe);
  }

  @Get('stats')
  async getVideoStats(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;

    const [movieStats, tvStats] = await Promise.all([
      this.historyService.getMovieWatchingStats(timeframe),
      this.historyService.getTVWatchingStats(timeframe),
    ]);

    return {
      movies: movieStats,
      tv: tvStats,
    };
  }
}
