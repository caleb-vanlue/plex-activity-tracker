import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';
import { BaseStatsRepository } from 'src/common/repositories/base-stats.repository';

@Injectable()
export class MovieStatsRepository extends BaseStatsRepository {
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
        COUNT(DISTINCT session."mediaId") as uniqueMovies,
        COUNT(DISTINCT movie.director) as uniqueDirectors,
        SUM(session."timeWatchedMs") as totalWatchingTimeMs
      FROM user_media_sessions session
      JOIN movies movie ON movie.id = session."mediaId"
      WHERE session."mediaType" = 'movie'
      ${timeConstraint}
    `;

    const stats = await this.query(query);

    const topDirectors = await this.getTopDirectors(timeframe);
    const recentMovies = await this.findRecentSessions('movie', 10);

    return {
      ...stats[0],
      topDirectors: topDirectors.slice(0, 10),
      recentMovies: recentMovies.map((session) => ({
        ...session.movie,
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
        COUNT(DISTINCT session."mediaId") as uniqueMovies,
        COUNT(DISTINCT movie.director) as uniqueDirectors,
        SUM(session."timeWatchedMs") as totalWatchingTimeMs
      FROM user_media_sessions session
      JOIN movies movie ON movie.id = session."mediaId"
      WHERE session."mediaType" = 'movie'
      AND session."userId" = $1
      ${timeConstraint}
    `;

    const stats = await this.query(query, [userId]);

    const topDirectors = await this.getUserTopDirectors(userId, timeframe);
    const recentMovies = await this.findRecentSessions('movie', 10, userId);

    return {
      userId,
      ...stats[0],
      topDirectors: topDirectors.slice(0, 10),
      recentMovies: recentMovies.map((session) => ({
        ...session.movie,
        sessionId: session.id,
        state: session.state,
        startTime: session.startTime,
        endTime: session.endTime,
        timeWatchedMs: session.timeWatchedMs,
      })),
    };
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        movie.director,
        COUNT(DISTINCT session."mediaId") as movies,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN movies movie ON movie.id = session."mediaId"
      WHERE session."mediaType" = 'movie'
      AND movie.director IS NOT NULL
      ${timeConstraint}
      GROUP BY movie.director
      ORDER BY timeWatchedMs DESC
    `;

    return this.query(query);
  }

  async getUserTopDirectors(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        movie.director,
        COUNT(DISTINCT session."mediaId") as movies,
        SUM(session."timeWatchedMs") as timeWatchedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN movies movie ON movie.id = session."mediaId"
      WHERE session."mediaType" = 'movie'
      AND session."userId" = $1
      AND movie.director IS NOT NULL
      ${timeConstraint}
      GROUP BY movie.director
      ORDER BY timeWatchedMs DESC
    `;

    return this.query(query, [userId]);
  }

  async findByDirector(director: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (movie.id)
        movie.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM movies movie
      JOIN user_media_sessions session ON movie.id = session."mediaId"
      WHERE movie.director = $1
      AND session."mediaType" = 'movie'
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $2
    `;

    return this.query(query, [director, limit]);
  }

  async findByDirectorAndUser(
    director: string,
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (movie.id)
        movie.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON movie.id = session."mediaId"
      WHERE movie.director = $1
      AND session."userId" = $2
      AND session."mediaType" = 'movie'
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [director, userId, limit]);
  }

  async findByStudio(studio: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (movie.id)
        movie.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM movies movie
      JOIN user_media_sessions session ON movie.id = session."mediaId"
      WHERE movie.studio = $1
      AND session."mediaType" = 'movie'
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $2
    `;

    return this.query(query, [studio, limit]);
  }

  async findByStudioAndUser(
    studio: string,
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (movie.id)
        movie.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON movie.id = session."mediaId"
      WHERE movie.studio = $1
      AND session."userId" = $2
      AND session."mediaType" = 'movie'
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [studio, userId, limit]);
  }
}
