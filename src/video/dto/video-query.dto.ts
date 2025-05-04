import { IsOptional, IsString, IsNumberString, IsIn } from 'class-validator';

export class VideoQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: number;

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
  @IsNumberString()
  season?: string;

  @IsOptional()
  @IsIn(['playing', 'paused', 'stopped', 'all'])
  state?: string;
}
