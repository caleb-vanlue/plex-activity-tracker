import { IsOptional, IsString } from 'class-validator';
import { MediaQueryDto } from '../../common/dto/media-query.dto';

export class TrackQueryDto extends MediaQueryDto {
  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;
}
