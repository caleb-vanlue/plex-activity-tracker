import { Repository } from 'typeorm';
import { BaseMediaEntity } from '../entities/base-media.entity';

export abstract class BaseMediaRepository<T extends BaseMediaEntity> {
  constructor(protected repository: Repository<T>) {}

  async create(data: any): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity as any);
  }

  async update(id: string, data: any): Promise<T | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity as any);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
    });
  }

  async findByRatingKey(ratingKey: string): Promise<T | null> {
    return this.repository.findOne({
      where: { ratingKey } as any,
    });
  }

  async findRecent(limit: number = 10): Promise<T[]> {
    return this.repository.find({
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async findByState(state: string, limit: number = 10): Promise<T[]> {
    return this.repository.find({
      where: { state } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async query(queryString: string, parameters?: any[]): Promise<any> {
    return this.repository.query(queryString, parameters);
  }

  protected getTimeframeCondition(
    timeframe: 'day' | 'week' | 'month' | 'all',
    fieldName: string,
  ): string {
    switch (timeframe) {
      case 'day':
        return `AND "${fieldName}" > NOW() - INTERVAL '1 day'`;
      case 'week':
        return `AND "${fieldName}" > NOW() - INTERVAL '7 days'`;
      case 'month':
        return `AND "${fieldName}" > NOW() - INTERVAL '30 days'`;
      default:
        return '';
    }
  }
}
