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
      order: { createdAt: 'DESC' }, // Changed from startTime to createdAt
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
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (episode.id) 
        episode.*
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE episode."showTitle" = $1 AND session."userId" = $2
      ORDER BY episode.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [showTitle, user, limit]);
  }

  async findBySeasonAndUser(
    showTitle: string,
    season: number,
    user: string,
    limit: number = 50,
  ): Promise<Episode[]> {
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (episode.id) 
        episode.*
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE episode."showTitle" = $1 AND episode.season = $2 AND session."userId" = $3
      ORDER BY episode.id, episode.episode ASC
      LIMIT $4
    `;

    return this.query(query, [showTitle, season, user, limit]);
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    // This method should now delegate to EpisodeStatsRepository
    // For backward compatibility, we'll leave a simplified version
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT episode.id) as "totalEpisodes",
        COUNT(DISTINCT episode."showTitle") as "uniqueShows",
        SUM(session."timeWatchedMs") as "totalWatchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE 1=1 ${timeframeCondition}
    `;

    const topShowsQuery = `
      SELECT 
        episode."showTitle",
        COUNT(DISTINCT episode.id) as "episodeCount",
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE 1=1 ${timeframeCondition}
      GROUP BY episode."showTitle"
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
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT episode.id) as "totalEpisodes",
        COUNT(DISTINCT episode."showTitle") as "uniqueShows",
        SUM(session."timeWatchedMs") as "totalWatchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE session."userId" = $1 ${timeframeCondition}
    `;

    const topShowsQuery = `
      SELECT 
        episode."showTitle",
        COUNT(DISTINCT episode.id) as "episodeCount",
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE session."userId" = $1 ${timeframeCondition}
      GROUP BY episode."showTitle"
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, topShows] = await Promise.all([
      this.query(statsQuery, [user]),
      this.query(topShowsQuery, [user]),
    ]);

    return {
      user,
      stats: stats[0],
      topShows,
    };
  }

  async getShowsInProgress(): Promise<any> {
    const query = `
      SELECT 
        episode."showTitle",
        episode.season,
        COUNT(DISTINCT episode.id) as "watchedEpisodes",
        MAX(session."timeWatchedMs"/(episode.duration*1000)) as "maxProgress",
        AVG(session."timeWatchedMs"/(episode.duration*1000)) as "avgProgress",
        MAX(session."startTime") as "lastWatched"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE session."timeWatchedMs" > 0 AND episode.duration > 0
      GROUP BY episode."showTitle", episode.season
      ORDER BY "lastWatched" DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserShowsInProgress(user: string): Promise<any> {
    const query = `
      SELECT 
        episode."showTitle",
        episode.season,
        COUNT(DISTINCT episode.id) as "watchedEpisodes",
        MAX(session."timeWatchedMs"/(episode.duration*1000)) as "maxProgress",
        AVG(session."timeWatchedMs"/(episode.duration*1000)) as "avgProgress",
        MAX(session."startTime") as "lastWatched"
      FROM episodes episode
      JOIN user_media_sessions session ON session."mediaId" = episode.id AND session."mediaType" = 'episode'
      WHERE session."timeWatchedMs" > 0 AND episode.duration > 0 AND session."userId" = $1
      GROUP BY episode."showTitle", episode.season
      ORDER BY "lastWatched" DESC
      LIMIT 10
    `;

    return this.query(query, [user]);
  }
}
