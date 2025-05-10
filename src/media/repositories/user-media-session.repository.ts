import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';

@Injectable()
export class UserMediaSessionRepository {
  private readonly logger = new Logger(UserMediaSessionRepository.name);

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
    const queryBuilder = this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .leftJoinAndSelect('session.movie', 'movie')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.userId = :userId', { userId })
      .andWhere('session.mediaType = :mediaType', { mediaType })
      .andWhere(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      );

    if (mediaId) {
      queryBuilder.andWhere('session.mediaId = :mediaId', { mediaId });
    }

    this.logger.debug(`Finding active session: ${queryBuilder.getSql()}`);

    return queryBuilder.orderBy('session.startTime', 'DESC').getOne();
  }

  async findAllActiveTracks(userId: string): Promise<UserMediaSession[]> {
    return this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .where('session.userId = :userId', { userId })
      .andWhere('session.mediaType = :mediaType', { mediaType: 'track' })
      .andWhere(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      )
      .getMany();
  }

  async findAllActiveMovies(userId: string): Promise<UserMediaSession[]> {
    return this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.movie', 'movie')
      .where('session.userId = :userId', { userId })
      .andWhere('session.mediaType = :mediaType', { mediaType: 'movie' })
      .andWhere(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      )
      .getMany();
  }

  async findAllActiveEpisodes(userId: string): Promise<UserMediaSession[]> {
    return this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.userId = :userId', { userId })
      .andWhere('session.mediaType = :mediaType', { mediaType: 'episode' })
      .andWhere(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      )
      .getMany();
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
    return this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .leftJoinAndSelect('session.movie', 'movie')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.userId = :userId', { userId })
      .andWhere(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      )
      .getMany();
  }

  async findAllActive(): Promise<UserMediaSession[]> {
    return this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .leftJoinAndSelect('session.movie', 'movie')
      .leftJoinAndSelect('session.episode', 'episode')
      .where(
        '(session.state = :playingState OR session.state = :pausedState)',
        { playingState: 'playing', pausedState: 'paused' },
      )
      .getMany();
  }

  async findRecentSessions(
    mediaType: string,
    limit: number = 10,
    userId?: string,
  ): Promise<UserMediaSession[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .leftJoinAndSelect('session.movie', 'movie')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.mediaType = :mediaType', { mediaType });

    if (userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId });
    }

    return queryBuilder
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();
  }

  async findPausedSessions(
    userId?: string,
    mediaType?: string,
  ): Promise<UserMediaSession[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.track', 'track')
      .leftJoinAndSelect('session.movie', 'movie')
      .leftJoinAndSelect('session.episode', 'episode')
      .where('session.state = :state', { state: 'paused' });

    if (userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId });
    }

    if (mediaType) {
      queryBuilder.andWhere('session.mediaType = :mediaType', { mediaType });
    }

    return queryBuilder.getMany();
  }

  async cleanupStaleSessions(
    olderThan: number = 3 * 60 * 60 * 1000,
  ): Promise<number> {
    const staleDate = new Date(Date.now() - olderThan);

    const stalePausedSessions = await this.repository
      .createQueryBuilder('session')
      .where('session.state = :state', { state: 'paused' })
      .andWhere('session.pausedAt < :staleDate', { staleDate })
      .getMany();

    let updatedCount = 0;

    for (const session of stalePausedSessions) {
      await this.update(session.id, {
        state: 'stopped',
        endTime: session.pausedAt,
      });
      updatedCount++;
    }

    const stalePlayingSessions = await this.repository
      .createQueryBuilder('session')
      .where('session.state = :state', { state: 'playing' })
      .andWhere('session.startTime < :staleDate', { staleDate })
      .getMany();

    for (const session of stalePlayingSessions) {
      await this.update(session.id, {
        state: 'stopped',
        endTime: new Date(),
      });
      updatedCount++;
    }

    return updatedCount;
  }

  createQueryBuilder(alias: string) {
    return this.repository.createQueryBuilder(alias);
  }

  query(queryString: string, parameters?: any[]): Promise<any> {
    return this.repository.query(queryString, parameters);
  }
}
