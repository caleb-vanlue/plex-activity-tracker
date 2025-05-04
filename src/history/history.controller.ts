import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { TrackQueryDto, StatsQueryDto } from './dto/track-query.dto';

@Controller('history')
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private historyService: HistoryService) {}

  @Get('current')
  async getCurrentTrack() {
    return this.historyService.getCurrentTrack();
  }

  @Get('tracks')
  async getTracks(@Query() query: TrackQueryDto) {
    const { limit = 10, artist, album, state } = query;
    this.logger.debug(
      `Fetching tracks with limit: ${limit}, filters: ${JSON.stringify({ artist, album, state })}`,
    );

    if (artist) {
      return this.historyService.getTracksByArtist(artist, limit);
    }

    if (album) {
      return this.historyService.getTracksByAlbum(album, limit);
    }

    if (state && state !== 'all') {
      return this.historyService.getTracksByState(state, limit);
    }

    return this.historyService.getRecentTracks(limit);
  }

  @Get('tracks/:id')
  async getTrackById(@Param('id') id: string) {
    const track = await this.historyService.getTrackById(id);
    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }
    return track;
  }

  @Get('stats')
  async getStats(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    this.logger.debug(`Fetching stats for timeframe: ${timeframe}`);
    return this.historyService.getListeningStats(timeframe);
  }

  @Get('artists')
  async getTopArtists(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    return this.historyService.getTopArtists(timeframe);
  }

  @Get('albums')
  async getTopAlbums(@Query() query: StatsQueryDto) {
    const { timeframe = 'all' } = query;
    return this.historyService.getTopAlbums(timeframe);
  }
}
