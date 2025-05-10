import { IsOptional, IsString, IsEnum } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  @IsEnum(['day', 'week', 'month', 'all'])
  timeframe?: 'day' | 'week' | 'month' | 'all' = 'all';

  @IsOptional()
  @IsString()
  user?: string;
}
