import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';
import { BaseStatsRepository } from 'src/common/repositories/base-stats.repository';

@Injectable()
export class CombinedStatsRepository extends BaseStatsRepository {
  constructor(
    @InjectRepository(UserMediaSession)
    repository: Repository<UserMediaSession>,
  ) {
    super(repository);
  }

  async getOverallStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as totalSessions,
        COUNT(DISTINCT session."userId") as uniqueUsers,
        SUM(session."timeWatchedMs") as totalTimeMs,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'track' THEN session."mediaId" END) as uniqueTracks,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'movie' THEN session."mediaId" END) as uniqueMovies,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'episode' THEN session."mediaId" END) as uniqueEpisodes
      FROM user_media_sessions session
      ${timeConstraint ? 'WHERE ' + timeConstraint.substring(4) : ''}
    `;

    const stats = await this.query(query);

    const mediaTypeQuery = `
      SELECT 
        session."mediaType",
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      ${timeConstraint ? 'WHERE ' + timeConstraint.substring(4) : ''}
      GROUP BY session."mediaType"
    `;

    const mediaTypeStats = await this.query(mediaTypeQuery);

    const topUsersQuery = `
      SELECT 
        session."userId",
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'track' THEN session."mediaId" END) as trackCount,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'movie' THEN session."mediaId" END) as movieCount,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'episode' THEN session."mediaId" END) as episodeCount,
        MAX(session."startTime") as lastActive
      FROM user_media_sessions session
      ${timeConstraint ? 'WHERE ' + timeConstraint.substring(4) : ''}
      GROUP BY session."userId"
      ORDER BY timeWatchedMs DESC
    `;

    const topUsers = await this.query(topUsersQuery);

    const recentActivityQuery = `
      SELECT 
        session.id,
        session."userId",
        session."mediaType",
        session."mediaId",
        session.state,
        session."startTime",
        session."endTime",
        session."timeWatchedMs",
        CASE 
          WHEN session."mediaType" = 'track' THEN track.title 
          WHEN session."mediaType" = 'movie' THEN movie.title
          WHEN session."mediaType" = 'episode' THEN episode.title
        END as title,
        CASE 
          WHEN session."mediaType" = 'track' THEN track.artist
          WHEN session."mediaType" = 'movie' THEN movie.director
          WHEN session."mediaType" = 'episode' THEN episode."showTitle"
        END as creator
      FROM user_media_sessions session
      LEFT JOIN tracks track ON session."mediaType" = 'track' AND track.id = session."mediaId"
      LEFT JOIN movies movie ON session."mediaType" = 'movie' AND movie.id = session."mediaId"
      LEFT JOIN episodes episode ON session."mediaType" = 'episode' AND episode.id = session."mediaId"
      ${timeConstraint ? 'WHERE ' + timeConstraint.substring(4) : ''}
      ORDER BY session."startTime" DESC
      LIMIT 20
    `;

    const recentActivity = await this.query(recentActivityQuery);

    return {
      ...stats[0],
      mediaTypeBreakdown: mediaTypeStats,
      topUsers: topUsers.slice(0, 10),
      recentActivity,
    };
  }

  async getUserStats(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);
    const userCondition = `AND session."userId" = '${userId}'`;

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as totalSessions,
        SUM(session."timeWatchedMs") as totalTimeMs,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'track' THEN session."mediaId" END) as uniqueTracks,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'movie' THEN session."mediaId" END) as uniqueMovies,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'episode' THEN session."mediaId" END) as uniqueEpisodes,
        MIN(session."startTime") as firstActive,
        MAX(session."startTime") as lastActive
      FROM user_media_sessions session
      WHERE 1=1 ${userCondition} ${timeConstraint}
    `;

    const stats = await this.query(query);

    const mediaTypeQuery = `
      SELECT 
        session."mediaType",
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      WHERE 1=1 ${userCondition} ${timeConstraint}
      GROUP BY session."mediaType"
    `;

    const mediaTypeStats = await this.query(mediaTypeQuery);

    const dayOfWeekQuery = `
      SELECT 
        EXTRACT(DOW FROM session."startTime") as dayOfWeek,
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      WHERE 1=1 ${userCondition} ${timeConstraint}
      GROUP BY EXTRACT(DOW FROM session."startTime")
      ORDER BY dayOfWeek
    `;

    const dayOfWeekStats = await this.query(dayOfWeekQuery);

    const timeOfDayQuery = `
      SELECT 
        EXTRACT(HOUR FROM session."startTime") as hourOfDay,
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      WHERE 1=1 ${userCondition} ${timeConstraint}
      GROUP BY EXTRACT(HOUR FROM session."startTime")
      ORDER BY hourOfDay
    `;

    const timeOfDayStats = await this.query(timeOfDayQuery);

    const recentActivityQuery = `
      SELECT 
        session.id,
        session."mediaType",
        session."mediaId",
        session.state,
        session."startTime",
        session."endTime",
        session."timeWatchedMs",
        CASE 
          WHEN session."mediaType" = 'track' THEN track.title 
          WHEN session."mediaType" = 'movie' THEN movie.title
          WHEN session."mediaType" = 'episode' THEN episode.title
        END as title,
        CASE 
          WHEN session."mediaType" = 'track' THEN track.artist
          WHEN session."mediaType" = 'movie' THEN movie.director
          WHEN session."mediaType" = 'episode' THEN episode."showTitle"
        END as creator
      FROM user_media_sessions session
      LEFT JOIN tracks track ON session."mediaType" = 'track' AND track.id = session."mediaId"
      LEFT JOIN movies movie ON session."mediaType" = 'movie' AND movie.id = session."mediaId"
      LEFT JOIN episodes episode ON session."mediaType" = 'episode' AND episode.id = session."mediaId"
      WHERE 1=1 ${userCondition} ${timeConstraint}
      ORDER BY session."startTime" DESC
      LIMIT 20
    `;

    const recentActivity = await this.query(recentActivityQuery);

    return {
      userId,
      ...stats[0],
      mediaTypeBreakdown: mediaTypeStats,
      usageByDayOfWeek: dayOfWeekStats,
      usageByTimeOfDay: timeOfDayStats,
      recentActivity,
    };
  }

  async getActiveUsersStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        session."userId",
        COUNT(DISTINCT session.id) as sessions,
        MAX(session."startTime") as lastActive,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'track' THEN session."mediaId" END) as tracks,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'movie' THEN session."mediaId" END) as movies,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'episode' THEN session."mediaId" END) as episodes,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      ${timeConstraint ? 'WHERE ' + timeConstraint.substring(4) : ''}
      GROUP BY session."userId"
      ORDER BY lastActive DESC
    `;

    return this.query(query);
  }

  async getTrendingMedia(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const tracksQuery = `
      SELECT 
        track.id,
        track.title,
        track.artist,
        track.album,
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."userId") as users,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      ${timeConstraint}
      GROUP BY track.id, track.title, track.artist, track.album
      ORDER BY sessions DESC
      LIMIT 10
    `;

    const trendingTracks = await this.query(tracksQuery);

    const moviesQuery = `
      SELECT 
        movie.id,
        movie.title,
        movie.year,
        movie.director,
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."userId") as users,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      JOIN movies movie ON movie.id = session."mediaId"
      WHERE session."mediaType" = 'movie'
      ${timeConstraint}
      GROUP BY movie.id, movie.title, movie.year, movie.director
      ORDER BY sessions DESC
      LIMIT 10
    `;

    const trendingMovies = await this.query(moviesQuery);

    const showsQuery = `
      SELECT 
        episode."showTitle",
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."userId") as users,
        COUNT(DISTINCT episode.id) as episodes,
        SUM(session."timeWatchedMs") as timeWatchedMs
      FROM user_media_sessions session
      JOIN episodes episode ON episode.id = session."mediaId"
      WHERE session."mediaType" = 'episode'
      ${timeConstraint}
      GROUP BY episode."showTitle"
      ORDER BY sessions DESC
      LIMIT 10
    `;

    const trendingShows = await this.query(showsQuery);

    return {
      tracks: trendingTracks,
      movies: trendingMovies,
      shows: trendingShows,
    };
  }

  async compareUsers(
    userIds: string[],
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const timeConstraint = this.getTimeframeCondition(timeframe);
    const userListStr = userIds.map((id) => `'${id}'`).join(',');

    const query = `
      SELECT 
        session."userId",
        COUNT(DISTINCT session.id) as sessions,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'track' THEN session."mediaId" END) as tracks,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'movie' THEN session."mediaId" END) as movies,
        COUNT(DISTINCT CASE WHEN session."mediaType" = 'episode' THEN session."mediaId" END) as episodes
      FROM user_media_sessions session
      WHERE session."userId" IN (${userListStr})
      ${timeConstraint}
      GROUP BY session."userId"
    `;

    const userStats = await this.query(query);

    const commonMediaQuery = `
      WITH user_media AS (
        SELECT 
          session."userId",
          session."mediaType",
          session."mediaId",
          session."timeWatchedMs"
        FROM user_media_sessions session
        WHERE session."userId" IN (${userListStr})
        ${timeConstraint}
      )
      
      SELECT 
        um."mediaType",
        um."mediaId",
        COUNT(DISTINCT um."userId") as userCount,
        CASE 
          WHEN um."mediaType" = 'track' THEN track.title 
          WHEN um."mediaType" = 'movie' THEN movie.title
          WHEN um."mediaType" = 'episode' THEN episode.title
        END as title,
        CASE 
          WHEN um."mediaType" = 'track' THEN track.artist
          WHEN um."mediaType" = 'movie' THEN movie.director
          WHEN um."mediaType" = 'episode' THEN episode."showTitle"
        END as creator
      FROM user_media um
      LEFT JOIN tracks track ON um."mediaType" = 'track' AND track.id = um."mediaId"
      LEFT JOIN movies movie ON um."mediaType" = 'movie' AND movie.id = um."mediaId"
      LEFT JOIN episodes episode ON um."mediaType" = 'episode' AND episode.id = um."mediaId"
      GROUP BY um."mediaType", um."mediaId", title, creator
      HAVING COUNT(DISTINCT um."userId") > 1
      ORDER BY userCount DESC, um."mediaType"
      LIMIT 20
    `;

    const commonMedia = await this.query(commonMediaQuery);

    return {
      userStats,
      commonMedia,
    };
  }
}
