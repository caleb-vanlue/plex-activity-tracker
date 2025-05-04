import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Episode } from '../entities/episode.entity';

@Injectable()
export class EpisodeRepository {
  constructor(
    @InjectRepository(Episode)
    private episodeRepo: Repository<Episode>,
  ) {}

  async createEpisode(episodeData: Partial<Episode>): Promise<Episode> {
    const episode = this.episodeRepo.create(episodeData);
    return this.episodeRepo.save(episode);
  }

  async updateEpisode(
    id: string,
    episodeData: Partial<Episode>,
  ): Promise<Episode | null> {
    await this.episodeRepo.update(id, episodeData);
    return this.episodeRepo.findOne({ where: { id } });
  }

  async findOne(options: any): Promise<Episode | null> {
    return this.episodeRepo.findOne(options);
  }

  async find(options: any): Promise<Episode[]> {
    return this.episodeRepo.find(options);
  }

  async findByRatingKey(ratingKey: string): Promise<Episode | null> {
    return this.episodeRepo.findOne({ where: { ratingKey } });
  }

  async findRecentEpisodes(limit: number = 10): Promise<Episode[]> {
    return this.episodeRepo.find({
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByShow(showTitle: string, limit: number = 10): Promise<Episode[]> {
    return this.episodeRepo.find({
      where: { showTitle },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findBySeason(
    showTitle: string,
    season: number,
    limit: number = 10,
  ): Promise<Episode[]> {
    return this.episodeRepo.find({
      where: { showTitle, season },
      order: { episode: 'ASC' },
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    let dateCondition = '';

    switch (timeframe) {
      case 'day':
        dateCondition = 'AND e."startTime" > NOW() - INTERVAL \'1 day\'';
        break;
      case 'week':
        dateCondition = 'AND e."startTime" > NOW() - INTERVAL \'7 days\'';
        break;
      case 'month':
        dateCondition = 'AND e."startTime" > NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateCondition = '';
    }

    const query = `
      SELECT 
        "showTitle",
        COUNT(*) as episode_count,
        SUM("watchedMs") as total_watched_ms
      FROM episodes e
      WHERE "watchedMs" IS NOT NULL ${dateCondition}
      GROUP BY "showTitle"
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.episodeRepo.query(query);
  }

  async getShowsInProgress(): Promise<any> {
    const query = `
      SELECT 
        "showTitle",
        COUNT(*) as episode_count,
        MAX("startTime") as last_watched
      FROM episodes
      WHERE state != 'stopped'
      GROUP BY "showTitle"
      ORDER BY last_watched DESC
      LIMIT 10
    `;

    return this.episodeRepo.query(query);
  }
}
