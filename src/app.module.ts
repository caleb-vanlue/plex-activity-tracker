import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlexController } from './plex/plex.controller';
import { HistoryService } from './history/history.service';
import { Track } from './history/entities/track.entity';
import { Movie } from './history/entities/movie.entity';
import { Episode } from './history/entities/episode.entity';
import { ThumbnailService } from './thumbnail/thumbnail.service';
import { HistoryController } from './history/history.controller';
import { VideoController } from './video/video.controller';
import { getDataSourceOptions } from 'typeorm.config';
import { EpisodeRepository } from './history/repositories/episode.repository';
import { MovieRepository } from './history/repositories/movie.repository';
import { TrackRepository } from './history/repositories/track.repository';

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
  ],
  controllers: [PlexController, HistoryController, VideoController],
  providers: [
    HistoryService,
    ThumbnailService,
    TrackRepository,
    MovieRepository,
    EpisodeRepository,
  ],
})
export class AppModule {}
