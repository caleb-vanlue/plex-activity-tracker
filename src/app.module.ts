import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlexController } from './plex/plex.controller';
import { HistoryService } from './history/history.service';
import { TrackRepository } from './history/track.repository';
import { Track } from './history/entities/track.entity';
import { ThumbnailService } from './thumbnail/thumbnail.service';
import { HistoryController } from './history/history.controller';
import { getDataSourceOptions } from 'typeorm.config';

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
    TypeOrmModule.forFeature([Track]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlexController, HistoryController],
  providers: [HistoryService, ThumbnailService, TrackRepository],
})
export class AppModule {}
