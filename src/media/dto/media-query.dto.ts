import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class MediaQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  studio?: string;

  @IsOptional()
  @IsString()
  show?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  season?: number;

  @IsOptional()
  @IsEnum(['playing', 'paused', 'stopped', 'all'])
  state?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'all'])
  timeframe?: 'day' | 'week' | 'month' | 'all';
}
