import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './media/entities/track.entity';
import { Movie } from './media/entities/movie.entity';
import { Episode } from './media/entities/episode.entity';
import { ThumbnailService } from './thumbnail/thumbnail.service';
import { MediaController } from './media/media.controller';
import { getDataSourceOptions } from 'typeorm.config';
import { TrackRepository } from './media/repositories/track.repository';
import { MovieRepository } from './media/repositories/movie.repository';
import { EpisodeRepository } from './media/repositories/episode.repository';
import { MediaService } from './media/media.service';
import { MediaEventService } from './media/media-event.service';
import { ThumbnailModule } from './thumbnail/thumbnail.module';
import { HttpModule } from '@nestjs/axios';
import { PlexController } from './plex/plex.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        return getDataSourceOptions();
      },
    }),
    TypeOrmModule.forFeature([Track, Movie, Episode]),
    EventEmitterModule.forRoot(),
    ThumbnailModule,
    HttpModule,
  ],
  controllers: [PlexController, MediaController],
  providers: [
    ThumbnailService,
    TrackRepository,
    MovieRepository,
    EpisodeRepository,
    MediaService,
    MediaEventService,
  ],
})
export class AppModule {}
