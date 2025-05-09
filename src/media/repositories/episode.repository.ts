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
      where: { showTitle },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
  ): Promise<Episode[]> {
    return this.repository.find({
      where: { showTitle, season },
      order: { episode: 'ASC' },
      take: limit,
    });
  }

  async findByShowAndUser(
    showTitle: string,
    user: string,
    limit: number = 10,
  ): Promise<Episode[]> {
    return this.repository.find({
      where: { showTitle, user },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findBySeasonAndUser(
    showTitle: string,
    season: number,
    user: string,
    limit: number = 50,
  ): Promise<Episode[]> {
    return this.repository.find({
      where: { showTitle, season, user },
      order: { episode: 'ASC' },
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalEpisodes",
        COUNT(DISTINCT "showTitle") as "uniqueShows",
        SUM("watchedMs") as "totalWatchedMs"
      FROM episodes
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
    `;

    const topShowsQuery = `
      SELECT 
        "showTitle",
        COUNT(*) as "episodeCount",
        SUM("watchedMs") as "watchedMs"
      FROM episodes
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
      GROUP BY "showTitle"
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, topShows] = await Promise.all([
      this.query(statsQuery),
      this.query(topShowsQuery),
    ]);

    return {
      stats: stats[0],
      topShows,
    };
  }

  async getUserWatchingStats(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');
    const userCondition = this.getUserCondition(user);

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalEpisodes",
        COUNT(DISTINCT "showTitle") as "uniqueShows",
        SUM("watchedMs") as "totalWatchedMs"
      FROM episodes
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
    `;

    const topShowsQuery = `
      SELECT 
        "showTitle",
        COUNT(*) as "episodeCount",
        SUM("watchedMs") as "watchedMs"
      FROM episodes
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
      GROUP BY "showTitle"
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, topShows] = await Promise.all([
      this.query(statsQuery),
      this.query(topShowsQuery),
    ]);

    return {
      user,
      stats: stats[0],
      topShows,
    };
  }

  async getShowsInProgress(): Promise<any> {
    const query = `
      WITH show_progress AS (
        SELECT 
          "showTitle",
          "season",
          COUNT(*) as "watchedEpisodes",
          MAX("percentComplete") as "maxProgress",
          AVG("percentComplete") as "avgProgress",
          MAX("startTime") as "lastWatched"
        FROM episodes
        WHERE "watchedMs" IS NOT NULL AND "percentComplete" > 0
        GROUP BY "showTitle", "season"
        ORDER BY "lastWatched" DESC
      )
      SELECT * FROM show_progress
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserShowsInProgress(user: string): Promise<any> {
    const query = `
      WITH show_progress AS (
        SELECT 
          "showTitle",
          "season",
          COUNT(*) as "watchedEpisodes",
          MAX("percentComplete") as "maxProgress",
          AVG("percentComplete") as "avgProgress",
          MAX("startTime") as "lastWatched"
        FROM episodes
        WHERE "watchedMs" IS NOT NULL AND "percentComplete" > 0 AND "user" = $1
        GROUP BY "showTitle", "season"
        ORDER BY "lastWatched" DESC
      )
      SELECT * FROM show_progress
      LIMIT 10
    `;

    return this.query(query, [user]);
  }
}
