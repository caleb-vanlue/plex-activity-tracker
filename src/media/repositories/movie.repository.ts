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
      where: { director } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async findByStudio(studio: string, limit: number = 10): Promise<Movie[]> {
    return this.repository.find({
      where: { studio } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const dateCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        title,
        COUNT(*) as watch_count,
        SUM("watchedMs") as total_watched_ms
      FROM movies
      WHERE "watchedMs" IS NOT NULL ${dateCondition}
      GROUP BY title
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const dateCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        director,
        COUNT(*) as watch_count,
        SUM("watchedMs") as total_watched_ms
      FROM movies
      WHERE "watchedMs" IS NOT NULL 
        AND director IS NOT NULL
        ${dateCondition}
      GROUP BY director
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.query(query);
  }
}
