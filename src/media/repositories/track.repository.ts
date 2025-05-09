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
      where: { artist },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.repository.find({
      where: { album },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByArtistAndUser(
    artist: string,
    user: string,
    limit: number = 10,
  ): Promise<Track[]> {
    return this.repository.find({
      where: { artist, user },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByAlbumAndUser(
    album: string,
    user: string,
    limit: number = 10,
  ): Promise<Track[]> {
    return this.repository.find({
      where: { album, user },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalTracks",
        COUNT(DISTINCT "artist") as "uniqueArtists",
        COUNT(DISTINCT "album") as "uniqueAlbums",
        SUM("listenedMs") as "totalListenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
    `;

    const topArtistsQuery = `
      SELECT 
        "artist",
        COUNT(*) as "trackCount",
        SUM("listenedMs") as "listenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
      GROUP BY "artist"
      ORDER BY "listenedMs" DESC
      LIMIT 5
    `;

    const [stats, topArtists] = await Promise.all([
      this.query(statsQuery),
      this.query(topArtistsQuery),
    ]);

    return {
      stats: stats[0],
      topArtists,
    };
  }

  async getUserListeningStats(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');
    const userCondition = this.getUserCondition(user);

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalTracks",
        COUNT(DISTINCT "artist") as "uniqueArtists",
        COUNT(DISTINCT "album") as "uniqueAlbums",
        SUM("listenedMs") as "totalListenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
    `;

    const topArtistsQuery = `
      SELECT 
        "artist",
        COUNT(*) as "trackCount",
        SUM("listenedMs") as "listenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
      GROUP BY "artist"
      ORDER BY "listenedMs" DESC
      LIMIT 5
    `;

    const [stats, topArtists] = await Promise.all([
      this.query(statsQuery),
      this.query(topArtistsQuery),
    ]);

    return {
      user,
      stats: stats[0],
      topArtists,
    };
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');

    const query = `
      SELECT 
        "album",
        "artist",
        COUNT(*) as "trackCount",
        SUM("listenedMs") as "listenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
      GROUP BY "album", "artist"
      ORDER BY "listenedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserTopAlbums(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeCondition = this.getTimeframeCondition(timeframe, 'startTime');
    const userCondition = this.getUserCondition(user);

    const query = `
      SELECT 
        "album",
        "artist",
        COUNT(*) as "trackCount",
        SUM("listenedMs") as "listenedMs"
      FROM tracks
      WHERE "listenedMs" IS NOT NULL
      ${timeCondition}
      ${userCondition}
      GROUP BY "album", "artist"
      ORDER BY "listenedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }
}
