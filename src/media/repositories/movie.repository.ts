import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../entities/movie.entity';
import { BaseMediaRepository } from '../../common/repositories/base-media.repository';

@Injectable()
export class MovieRepository extends BaseMediaRepository<Movie> {
  constructor(
    @InjectRepository(Movie)
    repository: Repository<Movie>,
  ) {
    super(repository);
  }

  async findByDirector(director: string, limit: number = 10): Promise<Movie[]> {
    return this.repository.find({
      where: { director },
      order: { createdAt: 'DESC' }, // Changed from startTime to createdAt
      take: limit,
    });
  }

  async findByStudio(studio: string, limit: number = 10): Promise<Movie[]> {
    return this.repository.find({
      where: { studio },
      order: { createdAt: 'DESC' }, // Changed from startTime to createdAt
      take: limit,
    });
  }

  async findByDirectorAndUser(
    director: string,
    user: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (movie.id) 
        movie.*
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE movie.director = $1 AND session."userId" = $2
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [director, user, limit]);
  }

  async findByStudioAndUser(
    studio: string,
    user: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (movie.id) 
        movie.*
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE movie.studio = $1 AND session."userId" = $2
      ORDER BY movie.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [studio, user, limit]);
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    // This method should now delegate to MovieStatsRepository
    // For backward compatibility, we'll leave a simplified version
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT movie.id) as "totalMovies",
        COUNT(DISTINCT movie.director) as "uniqueDirectors",
        COUNT(DISTINCT movie.studio) as "uniqueStudios",
        SUM(session."timeWatchedMs") as "totalWatchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE 1=1 ${timeframeCondition}
    `;

    const mostWatchedQuery = `
      SELECT 
        movie.title,
        movie.year,
        movie.director,
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE 1=1 ${timeframeCondition}
      GROUP BY movie.id, movie.title, movie.year, movie.director
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, mostWatched] = await Promise.all([
      this.query(statsQuery),
      this.query(mostWatchedQuery),
    ]);

    return {
      stats: stats[0],
      mostWatched,
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
        COUNT(DISTINCT movie.id) as "totalMovies",
        COUNT(DISTINCT movie.director) as "uniqueDirectors",
        COUNT(DISTINCT movie.studio) as "uniqueStudios",
        SUM(session."timeWatchedMs") as "totalWatchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE session."userId" = $1 ${timeframeCondition}
    `;

    const mostWatchedQuery = `
      SELECT 
        movie.title,
        movie.year,
        movie.director,
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE session."userId" = $1 ${timeframeCondition}
      GROUP BY movie.id, movie.title, movie.year, movie.director
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, mostWatched] = await Promise.all([
      this.query(statsQuery, [user]),
      this.query(mostWatchedQuery, [user]),
    ]);

    return {
      user,
      stats: stats[0],
      mostWatched,
    };
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        movie.director,
        COUNT(DISTINCT movie.id) as "movieCount",
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE movie.director IS NOT NULL ${timeframeCondition}
      GROUP BY movie.director
      ORDER BY "watchedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserTopDirectors(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        movie.director,
        COUNT(DISTINCT movie.id) as "movieCount",
        SUM(session."timeWatchedMs") as "watchedMs"
      FROM movies movie
      JOIN user_media_sessions session ON session."mediaId" = movie.id AND session."mediaType" = 'movie'
      WHERE movie.director IS NOT NULL AND session."userId" = $1 ${timeframeCondition}
      GROUP BY movie.director
      ORDER BY "watchedMs" DESC
      LIMIT 10
    `;

    return this.query(query, [user]);
  }
}
