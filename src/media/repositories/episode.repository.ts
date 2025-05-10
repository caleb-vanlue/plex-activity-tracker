import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Episode } from '../entities/episode.entity';
import { BaseMediaRepository } from './base-media.repository';

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
      order: { createdAt: 'DESC' },
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
}
