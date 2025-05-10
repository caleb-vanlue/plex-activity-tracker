import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaQueryDto } from '../../common/dto/media-query.dto';

export class MovieQueryDto extends MediaQueryDto {
  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  studio?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;
}
