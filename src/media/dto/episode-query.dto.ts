import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaQueryDto } from '../../common/dto/media-query.dto';

export class EpisodeQueryDto extends MediaQueryDto {
  @IsOptional()
  @IsString()
  show?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  season?: number;
}
