import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMediaSession } from '../entities/user-media-session.entity';
import { BaseStatsRepository } from 'src/common/repositories/base-stats.repository';

@Injectable()
export class TrackStatsRepository extends BaseStatsRepository {
  constructor(
    @InjectRepository(UserMediaSession)
    repository: Repository<UserMediaSession>,
  ) {
    super(repository);
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."mediaId") as uniqueTracks,
        COUNT(DISTINCT track.artist) as uniqueArtists,
        COUNT(DISTINCT track.album) as uniqueAlbums,
        SUM(session."timeWatchedMs") as totalListeningTimeMs
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      ${timeConstraint}
    `;

    const stats = await this.query(query);

    const topArtists = await this.getTopArtists(timeframe);
    const topAlbums = await this.getTopAlbums(timeframe);

    return {
      ...stats[0],
      topArtists: topArtists.slice(0, 10),
      topAlbums: topAlbums.slice(0, 10),
    };
  }

  async getUserListeningStats(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        COUNT(DISTINCT session.id) as sessions,
        COUNT(DISTINCT session."mediaId") as uniqueTracks,
        COUNT(DISTINCT track.artist) as uniqueArtists,
        COUNT(DISTINCT track.album) as uniqueAlbums,
        SUM(session."timeWatchedMs") as totalListeningTimeMs
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      AND session."userId" = $1
      ${timeConstraint}
    `;

    const stats = await this.query(query, [userId]);

    const topArtists = await this.getUserTopArtists(userId, timeframe);
    const topAlbums = await this.getUserTopAlbums(userId, timeframe);

    return {
      userId,
      ...stats[0],
      topArtists: topArtists.slice(0, 10),
      topAlbums: topAlbums.slice(0, 10),
    };
  }

  async getTopArtists(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        track.artist,
        COUNT(DISTINCT session."mediaId") as tracks,
        SUM(session."timeWatchedMs") as timeListenedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      ${timeConstraint}
      GROUP BY track.artist
      ORDER BY timeListenedMs DESC
    `;

    return this.query(query);
  }

  async getUserTopArtists(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        track.artist,
        COUNT(DISTINCT session."mediaId") as tracks,
        SUM(session."timeWatchedMs") as timeListenedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      AND session."userId" = $1
      ${timeConstraint}
      GROUP BY track.artist
      ORDER BY timeListenedMs DESC
    `;

    return this.query(query, [userId]);
  }

  async getTopAlbums(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        track.album,
        track.artist,
        COUNT(DISTINCT session."mediaId") as tracks,
        SUM(session."timeWatchedMs") as timeListenedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      ${timeConstraint}
      GROUP BY track.album, track.artist
      ORDER BY timeListenedMs DESC
    `;

    return this.query(query);
  }

  async getUserTopAlbums(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any[]> {
    const timeConstraint = this.getTimeframeCondition(timeframe);

    const query = `
      SELECT 
        track.album,
        track.artist,
        COUNT(DISTINCT session."mediaId") as tracks,
        SUM(session."timeWatchedMs") as timeListenedMs,
        COUNT(DISTINCT session.id) as sessions
      FROM user_media_sessions session
      JOIN tracks track ON track.id = session."mediaId"
      WHERE session."mediaType" = 'track'
      AND session."userId" = $1
      ${timeConstraint}
      GROUP BY track.album, track.artist
      ORDER BY timeListenedMs DESC
    `;

    return this.query(query, [userId]);
  }

  async findByArtist(artist: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (track.id)
        track.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM tracks track
      JOIN user_media_sessions session ON track.id = session."mediaId"
      WHERE track.artist = $1
      AND session."mediaType" = 'track'
      ORDER BY track.id, session."startTime" DESC
      LIMIT $2
    `;

    return this.query(query, [artist, limit]);
  }

  async findByArtistAndUser(
    artist: string,
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (track.id)
        track.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM tracks track
      JOIN user_media_sessions session ON track.id = session."mediaId"
      WHERE track.artist = $1
      AND session."userId" = $2
      AND session."mediaType" = 'track'
      ORDER BY track.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [artist, userId, limit]);
  }

  async findByAlbum(album: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (track.id)
        track.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs",
        session."userId"
      FROM tracks track
      JOIN user_media_sessions session ON track.id = session."mediaId"
      WHERE track.album = $1
      AND session."mediaType" = 'track'
      ORDER BY track.id, session."startTime" DESC
      LIMIT $2
    `;

    return this.query(query, [album, limit]);
  }

  async findByAlbumAndUser(
    album: string,
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (track.id)
        track.*,
        session.id as "sessionId",
        session."startTime",
        session."endTime",
        session.state,
        session."timeWatchedMs"
      FROM tracks track
      JOIN user_media_sessions session ON track.id = session."mediaId"
      WHERE track.album = $1
      AND session."userId" = $2
      AND session."mediaType" = 'track'
      ORDER BY track.id, session."startTime" DESC
      LIMIT $3
    `;

    return this.query(query, [album, userId, limit]);
  }
}
