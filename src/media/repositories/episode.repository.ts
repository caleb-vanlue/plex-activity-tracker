import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Episode } from '../entities/episode.entity';
import { BaseMediaRepository } from '../../common/repositories/base-media.repository';

@Injectable()
export class EpisodeRepository extends BaseMediaRepository<Episode> {
  constructor(
    @InjectRepository(Episode)
    repository: Repository<Episode>,
  ) {
    super(repository);
  }

  async findByShow(showTitle: string, limit: number = 10): Promise<Episode[]> {
    return this.repository.find({
      where: { showTitle } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async findBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
  ): Promise<Episode[]> {
    return this.repository.find({
      where: { showTitle, season } as any,
      order: { episode: 'ASC' } as any,
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const dateCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        "showTitle",
        COUNT(*) as episode_count,
        SUM("watchedMs") as total_watched_ms
      FROM episodes
      WHERE "watchedMs" IS NOT NULL ${dateCondition}
      GROUP BY "showTitle"
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.query(query);
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

    return this.query(query);
  }
}
