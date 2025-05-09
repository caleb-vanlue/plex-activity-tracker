import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';

@Injectable()
export class UserMediaSessionRepository {
  constructor(
    @InjectRepository(UserMediaSession)
    private repository: Repository<UserMediaSession>,
  ) {}

  async create(data: Partial<UserMediaSession>): Promise<UserMediaSession> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(
    id: string,
    data: Partial<UserMediaSession>,
  ): Promise<UserMediaSession | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<UserMediaSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['track', 'movie', 'episode'],
    });
  }

  async findActive(
    userId: string,
    mediaType: string,
    mediaId?: string,
  ): Promise<UserMediaSession | null> {
    const query: any = {
      userId,
      mediaType,
      state: 'playing',
    };

    if (mediaId) {
      query.mediaId = mediaId;
    }

    return this.repository.findOne({
      where: query,
      relations: ['track', 'movie', 'episode'],
    });
  }

  async findAllActiveTracks(userId: string): Promise<UserMediaSession[]> {
    return this.repository.find({
      where: {
        userId,
        mediaType: 'track',
        state: 'playing',
      },
      relations: ['track'],
    });
  }

  async findAllActiveMovies(userId: string): Promise<UserMediaSession[]> {
    return this.repository.find({
      where: {
        userId,
        mediaType: 'movie',
        state: 'playing',
      },
      relations: ['movie'],
    });
  }

  async findAllActiveEpisodes(userId: string): Promise<UserMediaSession[]> {
    return this.repository.find({
      where: {
        userId,
        mediaType: 'episode',
        state: 'playing',
      },
      relations: ['episode'],
    });
  }

  async findByTimeframe(
    userId: string,
    mediaType: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<UserMediaSession[]> {
    let query = this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect(`session.${mediaType}`, mediaType)
      .where('session.userId = :userId', { userId })
      .andWhere('session.mediaType = :mediaType', { mediaType });

    switch (timeframe) {
      case 'day':
        query = query.andWhere("session.startTime > NOW() - INTERVAL '1 day'");
        break;
      case 'week':
        query = query.andWhere("session.startTime > NOW() - INTERVAL '7 days'");
        break;
      case 'month':
        query = query.andWhere(
          "session.startTime > NOW() - INTERVAL '30 days'",
        );
        break;
    }

    return query.orderBy('session.startTime', 'DESC').getMany();
  }

  async findActiveByUser(userId: string): Promise<UserMediaSession[]> {
    return this.repository.find({
      where: {
        userId,
        state: 'playing',
      },
      relations: ['track', 'movie', 'episode'],
    });
  }

  async findAllActive(): Promise<UserMediaSession[]> {
    return this.repository.find({
      where: {
        state: 'playing',
      },
      relations: ['track', 'movie', 'episode'],
    });
  }

  async findRecentSessions(
    mediaType: string,
    limit: number = 10,
    userId?: string,
  ): Promise<UserMediaSession[]> {
    const query: any = {
      mediaType,
    };

    if (userId) {
      query.userId = userId;
    }

    return this.repository.find({
      where: query,
      relations: ['track', 'movie', 'episode'],
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  createQueryBuilder(alias: string) {
    return this.repository.createQueryBuilder(alias);
  }

  query(queryString: string, parameters?: any[]): Promise<any> {
    return this.repository.query(queryString, parameters);
  }
}
