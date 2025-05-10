import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from '../entities/track.entity';
import { BaseMediaRepository } from '../../common/repositories/base.repository';

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
      order: { createdAt: 'DESC' }, // Changed from startTime to createdAt
      take: limit,
    });
  }

  async findByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.repository.find({
      where: { album },
      order: { createdAt: 'DESC' }, // Changed from startTime to createdAt
      take: limit,
    });
  }

  async findByArtistAndUser(
    artist: string,
    user: string,
    limit: number = 10,
  ): Promise<Track[]> {
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (track.id) 
        track.*
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE track.artist = $1 AND session."userId" = $2
      ORDER BY track.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [artist, user, limit]);
  }

  async findByAlbumAndUser(
    album: string,
    user: string,
    limit: number = 10,
  ): Promise<Track[]> {
    // Since user is now handled by UserMediaSession, we need to use a query instead
    const query = `
      SELECT DISTINCT ON (track.id) 
        track.*
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE track.album = $1 AND session."userId" = $2
      ORDER BY track.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [album, user, limit]);
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    // This method should now delegate to TrackStatsRepository
    // For backward compatibility, we'll leave a simplified version
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        COUNT(DISTINCT track.id) as "totalTracks",
        COUNT(DISTINCT track.artist) as "uniqueArtists",
        COUNT(DISTINCT track.album) as "uniqueAlbums",
        SUM(session."timeWatchedMs") as "totalListenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE 1=1 ${timeframeCondition}
    `;

    const topArtistsQuery = `
      SELECT 
        track.artist,
        COUNT(DISTINCT track.id) as "trackCount",
        SUM(session."timeWatchedMs") as "listenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE 1=1 ${timeframeCondition}
      GROUP BY track.artist
      ORDER BY "listenedMs" DESC
      LIMIT 5
    `;

    const [stats, topArtists] = await Promise.all([
      this.query(query),
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
    // This method should now delegate to TrackStatsRepository
    // For backward compatibility, we'll leave a simplified version
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        COUNT(DISTINCT track.id) as "totalTracks",
        COUNT(DISTINCT track.artist) as "uniqueArtists",
        COUNT(DISTINCT track.album) as "uniqueAlbums",
        SUM(session."timeWatchedMs") as "totalListenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE session."userId" = $1 ${timeframeCondition}
    `;

    const topArtistsQuery = `
      SELECT 
        track.artist,
        COUNT(DISTINCT track.id) as "trackCount",
        SUM(session."timeWatchedMs") as "listenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE session."userId" = $1 ${timeframeCondition}
      GROUP BY track.artist
      ORDER BY "listenedMs" DESC
      LIMIT 5
    `;

    const [stats, topArtists] = await Promise.all([
      this.query(query, [user]),
      this.query(topArtistsQuery, [user]),
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
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        track.album,
        track.artist,
        COUNT(DISTINCT track.id) as "trackCount",
        SUM(session."timeWatchedMs") as "listenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE 1=1 ${timeframeCondition}
      GROUP BY track.album, track.artist
      ORDER BY "listenedMs" DESC
      LIMIT 10
    `;

    return this.query(query);
  }

  async getUserTopAlbums(
    user: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeframeCondition = this.getTimeframeCondition(
      timeframe,
      'session."startTime"',
    );

    const query = `
      SELECT 
        track.album,
        track.artist,
        COUNT(DISTINCT track.id) as "trackCount",
        SUM(session."timeWatchedMs") as "listenedMs"
      FROM tracks track
      JOIN user_media_sessions session ON session."mediaId" = track.id AND session."mediaType" = 'track'
      WHERE session."userId" = $1 ${timeframeCondition}
      GROUP BY track.album, track.artist
      ORDER BY "listenedMs" DESC
      LIMIT 10
    `;

    return this.query(query, [user]);
  }
}
