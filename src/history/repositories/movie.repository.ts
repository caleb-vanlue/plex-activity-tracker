import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../entities/movie.entity';

@Injectable()
export class MovieRepository {
  constructor(
    @InjectRepository(Movie)
    private movieRepo: Repository<Movie>,
  ) {}

  async createMovie(movieData: Partial<Movie>): Promise<Movie> {
    const movie = this.movieRepo.create(movieData);
    return this.movieRepo.save(movie);
  }

  async updateMovie(
    id: string,
    movieData: Partial<Movie>,
  ): Promise<Movie | null> {
    await this.movieRepo.update(id, movieData);
    return this.movieRepo.findOne({ where: { id } });
  }

  async findOne(options: any): Promise<Movie | null> {
    return this.movieRepo.findOne(options);
  }

  async find(options: any): Promise<Movie[]> {
    return this.movieRepo.find(options);
  }

  async findByRatingKey(ratingKey: string): Promise<Movie | null> {
    return this.movieRepo.findOne({ where: { ratingKey } });
  }

  async findRecentMovies(limit: number = 10): Promise<Movie[]> {
    return this.movieRepo.find({
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByDirector(director: string, limit: number = 10): Promise<Movie[]> {
    return this.movieRepo.find({
      where: { director },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByStudio(studio: string, limit: number = 10): Promise<Movie[]> {
    return this.movieRepo.find({
      where: { studio },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getWatchingStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    let dateCondition = '';

    switch (timeframe) {
      case 'day':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'1 day\'';
        break;
      case 'week':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'7 days\'';
        break;
      case 'month':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateCondition = '';
    }

    const query = `
      SELECT 
        title,
        COUNT(*) as watch_count,
        SUM("watchedMs") as total_watched_ms
      FROM movies m
      WHERE "watchedMs" IS NOT NULL ${dateCondition}
      GROUP BY title
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.movieRepo.query(query);
  }

  async getTopDirectors(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    let dateCondition = '';

    switch (timeframe) {
      case 'day':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'1 day\'';
        break;
      case 'week':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'7 days\'';
        break;
      case 'month':
        dateCondition = 'AND m."startTime" > NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateCondition = '';
    }

    const query = `
      SELECT 
        director,
        COUNT(*) as watch_count,
        SUM("watchedMs") as total_watched_ms
      FROM movies m
      WHERE "watchedMs" IS NOT NULL 
        AND director IS NOT NULL
        ${dateCondition}
      GROUP BY director
      ORDER BY total_watched_ms DESC
      LIMIT 10
    `;

    return this.movieRepo.query(query);
  }
}
