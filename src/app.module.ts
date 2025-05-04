import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlexController } from './plex/plex.controller';
import { HistoryService } from './history/history.service';
import { TrackRepository } from './history/track.repository';
import { Track } from './history/entities/track.entity';
import { ThumbnailService } from './thumbnail/thumbnail.service';
import { HistoryController } from './history/history.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'plex',
        entities: [Track],
      }),
    }),
    TypeOrmModule.forFeature([Track]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlexController, HistoryController],
  providers: [HistoryService, ThumbnailService, TrackRepository],
})
export class AppModule {}
