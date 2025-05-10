import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../entities/movie.entity';
import { BaseMediaRepository } from './base-media.repository';

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
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByStudio(studio: string, limit: number = 10): Promise<Movie[]> {
    return this.repository.find({
      where: { studio },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByDirectorAndUser(
    director: string,
    user: string,
    limit: number = 10,
  ): Promise<Movie[]> {
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
}
