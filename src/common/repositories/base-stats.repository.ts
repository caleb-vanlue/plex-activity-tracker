import { UserMediaSession } from '../../media/entities/user-media-session.entity';
import { Repository } from 'typeorm';

export abstract class BaseStatsRepository {
  constructor(protected repository: Repository<UserMediaSession>) {}

  protected getTimeframeCondition(
    timeframe: 'day' | 'week' | 'month' | 'all',
    fieldName: string = 'session.startTime',
  ): string {
    switch (timeframe) {
      case 'day':
        return `AND ${fieldName} > NOW() - INTERVAL '1 day'`;
      case 'week':
        return `AND ${fieldName} > NOW() - INTERVAL '7 days'`;
      case 'month':
        return `AND ${fieldName} > NOW() - INTERVAL '30 days'`;
      default:
        return '';
    }
  }

  protected getUserCondition(user?: string): string {
    return user ? `AND session."userId" = '${user}'` : '';
  }

  async getMediaSessionById(id: string): Promise<UserMediaSession | null> {
    return this.repository.findOne({
      where: { id } as any,
      relations: ['track', 'movie', 'episode', 'user'],
    });
  }

  async findRecentSessions(
    mediaType: string,
    limit: number = 10,
    userId?: string,
  ): Promise<UserMediaSession[]> {
    const query = this.repository
      .createQueryBuilder('session')
      .where('session.mediaType = :mediaType', { mediaType });

    if (userId) {
      query.andWhere('session.userId = :userId', { userId });
    }

    return query
      .leftJoinAndSelect(`session.${mediaType}`, mediaType)
      .orderBy('session.startTime', 'DESC')
      .take(limit)
      .getMany();
  }

  async query(queryString: string, parameters?: any[]): Promise<any> {
    return this.repository.query(queryString, parameters);
  }
}
