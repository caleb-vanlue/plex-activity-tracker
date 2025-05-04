// src/history/repositories/track.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from '../entities/track.entity';
import { BaseMediaRepository } from '../../common/repositories/base-media.repository';

@Injectable()
export class TrackRepository extends BaseMediaRepository<Track> {
  constructor(
    @InjectRepository(Track)
    repository: Repository<Track>,
  ) {
    super(repository);
  }

  async findByArtist(artist: string, limit: number = 10): Promise<Track[]> {
    return this.repository.find({
      where: { artist } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async findByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.repository.find({
      where: { album } as any,
      order: { startTime: 'DESC' } as any,
      take: limit,
    });
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const dateCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        artist,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks
      WHERE "listenedMs" IS NOT NULL ${dateCondition}
      GROUP BY artist
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const dateCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        album,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks
      WHERE "listenedMs" IS NOT NULL ${dateCondition}
      GROUP BY album
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `;

    return this.query(query);
  }
}
