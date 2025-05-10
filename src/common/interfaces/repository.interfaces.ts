import { Repository, ObjectLiteral } from 'typeorm';

export interface BaseRepository<T extends ObjectLiteral> {
  repository: Repository<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  findByRatingKey?(ratingKey: string): Promise<T | null>;
  query(queryString: string, parameters?: any[]): Promise<any>;
}

export interface MediaRepository<T extends ObjectLiteral>
  extends BaseRepository<T> {
  findByRatingKey(ratingKey: string): Promise<T | null>;
  findRecent(limit?: number): Promise<T[]>;
}

export interface StatsRepository {
  getTimeframeCondition(
    timeframe: 'day' | 'week' | 'month' | 'all',
    fieldName?: string,
  ): string;
  getUserCondition(user?: string): string;
  query(queryString: string, parameters?: any[]): Promise<any>;
}
