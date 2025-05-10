import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStateEnum } from '../constants/media.constants';

export class MediaQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsEnum(Object.values(SessionStateEnum))
  state?: string = 'all';

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'all'])
  timeframe?: 'day' | 'week' | 'month' | 'all' = 'all';
}
