import { IsOptional, IsString, IsIn } from 'class-validator';

export class CurrentMediaDto {
  @IsOptional()
  @IsString()
  @IsIn(['all', 'track', 'movie', 'episode'])
  type?: string = 'all';

  @IsOptional()
  @IsString()
  user?: string;
}
