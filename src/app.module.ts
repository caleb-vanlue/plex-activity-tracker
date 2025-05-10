import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDataSourceOptions } from 'typeorm.config';
import { HttpModule } from '@nestjs/axios';

// Entities
import { Track } from './media/entities/track.entity';
import { Movie } from './media/entities/movie.entity';
import { Episode } from './media/entities/episode.entity';
import { User } from './media/entities/user.entity';
import { UserMediaSession } from './media/entities/user-media-session.entity';

// Controllers
import { PlexController } from './plex/plex.controller';
import { MediaController } from './media/media.controller';

// Services and Repositories
import { ThumbnailService } from './thumbnail/thumbnail.service';
import { TrackRepository } from './media/repositories/track.repository';
import { MovieRepository } from './media/repositories/movie.repository';
import { EpisodeRepository } from './media/repositories/episode.repository';
import { MediaService } from './media/media.service';
import { MediaEventService } from './media/media-event.service';
import { TrackStatsRepository } from './media/repositories/track-stats.repository';
import { MovieStatsRepository } from './media/repositories/movie-stats.repository';
import { EpisodeStatsRepository } from './media/repositories/episode-stats.repository';
import { CombinedStatsRepository } from './media/repositories/combined-stats.repository';
import { UserMediaSessionRepository } from './media/repositories/user-media-session.repository';
import { UserRepository } from './media/repositories/user.repository';

// New Components
import { TrackProcessor } from './media/processors/track.processor';
import { MovieProcessor } from './media/processors/movie.processor';
import { EpisodeProcessor } from './media/processors/episode.processor';
import { MediaProcessorFactory } from './media/processors/media-processor.factory';
import { MediaSessionManager } from './media/managers/media-session.manager';
import { ThumbnailModule } from './thumbnail/thumbnail.module';

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
    TypeOrmModule.forFeature([Track, Movie, Episode, User, UserMediaSession]),
    EventEmitterModule.forRoot(),
    ThumbnailModule,
    HttpModule,
  ],
  controllers: [PlexController, MediaController],
  providers: [
    // Existing providers
    ThumbnailService,
    TrackRepository,
    MovieRepository,
    EpisodeRepository,
    MediaService,
    MediaEventService,
    TrackStatsRepository,
    MovieStatsRepository,
    EpisodeStatsRepository,
    CombinedStatsRepository,
    UserMediaSessionRepository,
    UserRepository,

    // New providers
    TrackProcessor,
    MovieProcessor,
    EpisodeProcessor,
    MediaProcessorFactory,
    MediaSessionManager,
  ],
})
export class AppModule {}
