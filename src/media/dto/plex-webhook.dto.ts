import { IsOptional, IsString, IsObject } from 'class-validator';

export class PlexWebhookDto {
  @IsOptional()
  @IsString()
  payload?: string;

  @IsOptional()
  @IsObject()
  thumb?: any;
}
