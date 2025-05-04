import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsString()
  @IsIn(['playing', 'paused', 'stopped', 'all'])
  state?: string = 'all';
}

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month', 'all'])
  timeframe?: 'day' | 'week' | 'month' | 'all' = 'all';
}
