import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';
import { BaseStatsRepository } from '../../common/repositories/base-stats.repository';

@Injectable()
export class EpisodeStatsRepository extends BaseStatsRepository {
  constructor(
    @InjectRepository(UserMediaSession)
    repository: Repository<UserMediaSession>,
  ) {
    super(repository);
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."mediaId") as uniqueEpisodes,
        COUNT(DISTINCT episode."showTitle") as uniqueShows,
        SUM(session."timeWatchedMs") as totalWatchingTimeMs
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      ${timeConstraint}
    `;

    const stats = await this.query(query);

    const topShows = await this.getTopShows(timeframe);
    const recentEpisodes = await this.findRecentSessions('episode', 10);

    return {
      ...stats[0],
      topShows: topShows.slice(0, 10),
      recentEpisodes: recentEpisodes.map((session) => ({
        ...session.episode,
        sessionId: session.id,
        state: session.state,
        startTime: session.startTime,
        endTime: session.endTime,
        timeWatchedMs: session.timeWatchedMs,
        userId: session.userId,
      })),
    };
  }

  async getUserWatchingStats(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."mediaId") as uniqueEpisodes,
        COUNT(DISTINCT episode."showTitle") as uniqueShows,
        SUM(session."timeWatchedMs") as totalWatchingTimeMs
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      AND session."userId" = $1
      ${timeConstraint}
    `;

    const stats = await this.query(query, [userId]);

    const topShows = await this.getUserTopShows(userId, timeframe);
    const recentEpisodes = await this.findRecentSessions('episode', 10, userId);

    return {
      userId,
      ...stats[0],
      topShows: topShows.slice(0, 10),
      recentEpisodes: recentEpisodes.map((session) => ({
        ...session.episode,
        sessionId: session.id,
        state: session.state,
        startTime: session.startTime,
        endTime: session.endTime,
        timeWatchedMs: session.timeWatchedMs,
      })),
    };
  }

  async getTopShows(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        episode."showTitle",
        COUNT(DISTINCT session."mediaId") as episodes,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      ${timeConstraint}
      GROUP BY episode."showTitle"
      ORDER BY timeWatchedMs DESC
    `;

    return this.query(query);
  }

  async getUserTopShows(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        episode."showTitle",
        COUNT(DISTINCT session."mediaId") as episodes,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      AND session."userId" = $1
      ${timeConstraint}
      GROUP BY episode."showTitle"
      ORDER BY timeWatchedMs DESC
    `;

    return this.query(query, [userId]);
  }

  async getShowsInProgress(): Promise<any[]> {
    const query = `
      SELECT 
        episode."showTitle",
        MAX(session."startTime") as lastWatched,
        COUNT(DISTINCT episode.id) as watchedEpisodes,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      GROUP BY episode."showTitle"
      ORDER BY lastWatched DESC
    `;

    return this.query(query);
  }

  async getUserShowsInProgress(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        episode."showTitle",
        MAX(session."startTime") as lastWatched,
        COUNT(DISTINCT episode.id) as watchedEpisodes,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      AND session."userId" = $1
      GROUP BY episode."showTitle"
      ORDER BY lastWatched DESC
    `;

    return this.query(query, [userId]);
  }

  async findByShow(showTitle: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (episode.id)
        episode.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM episodes episode
      JOIN user_media_sessions session ON episode.id = session."mediaId"
      WHERE episode."showTitle" = $1
      AND session."mediaType" = 'episode'
      ORDER BY episode.id, session."startTime" DESC
      LIMIT $2
    `;

    return this.query(query, [showTitle, limit]);
  }

  async findByShowAndUser(
    showTitle: string,
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (episode.id)
        episode.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON episode.id = session."mediaId"
      WHERE episode."showTitle" = $1
      AND session."userId" = $2
      AND session."mediaType" = 'episode'
      ORDER BY episode.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [showTitle, userId, limit]);
  }

  async findBySeason(
    showTitle: string,
    season: number,
    limit: number = 50,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (episode.id)
        episode.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM episodes episode
      JOIN user_media_sessions session ON episode.id = session."mediaId"
      WHERE episode."showTitle" = $1
      AND episode.season = $2
      AND session."mediaType" = 'episode'
      ORDER BY episode.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [showTitle, season, limit]);
  }

  async findBySeasonAndUser(
    showTitle: string,
    season: number,
    userId: string,
    limit: number = 50,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (episode.id)
        episode.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM episodes episode
      JOIN user_media_sessions session ON episode.id = session."mediaId"
      WHERE episode."showTitle" = $1
      AND episode.season = $2
      AND session."userId" = $3
      AND session."mediaType" = 'episode'
      ORDER BY episode.id, session."startTime" DESC
      LIMIT $4
    `;

    return this.query(query, [showTitle, season, userId, limit]);
  }
}
