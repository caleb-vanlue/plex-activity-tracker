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
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByStudio(studio: string, limit: number = 10): Promise<Movie[]> {
    return this.repository.find({
      where: { studio },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByDirectorAndUser(
    director: string,
    user: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    return this.repository.find({
      where: { director, user },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByStudioAndUser(
    studio: string,
    user: string,
    limit: number = 10,
  ): Promise<Movie[]> {
    return this.repository.find({
      where: { studio, user },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalMovies",
        COUNT(DISTINCT "director") as "uniqueDirectors",
        COUNT(DISTINCT "studio") as "uniqueStudios",
        SUM("watchedMs") as "totalWatchedMs"
      FROM movies
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
    `;

    const mostWatchedQuery = `
      SELECT 
        "title",
        "year",
        "director",
        "watchedMs",
        "percentComplete"
      FROM movies
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
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
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');
    const userCondition = this.getUserCondition(user);

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalMovies",
        COUNT(DISTINCT "director") as "uniqueDirectors",
        COUNT(DISTINCT "studio") as "uniqueStudios",
        SUM("watchedMs") as "totalWatchedMs"
      FROM movies
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
    `;

    const mostWatchedQuery = `
      SELECT 
        "title",
        "year",
        "director",
        "watchedMs",
        "percentComplete"
      FROM movies
      WHERE "watchedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
      ORDER BY "watchedMs" DESC
      LIMIT 5
    `;

    const [stats, mostWatched] = await Promise.all([
      this.query(statsQuery),
      this.query(mostWatchedQuery),
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
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        "director",
        COUNT(*) as "movieCount",
        SUM("watchedMs") as "watchedMs"
      FROM movies
      WHERE "director" IS NOT NULL AND "watchedMs" IS NOT NULL
      ${timeCondition}
      GROUP BY "director"
      ORDER BY "watchedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserTopDirectors(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');
    const userCondition = this.getUserCondition(user);

    const query = `
      SELECT 
        "director",
        COUNT(*) as "movieCount",
        SUM("watchedMs") as "watchedMs"
      FROM movies
      WHERE "director" IS NOT NULL AND "watchedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
      GROUP BY "director"
      ORDER BY "watchedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }
}
