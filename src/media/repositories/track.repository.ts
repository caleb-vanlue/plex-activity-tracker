import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from '../entities/track.entity';
import { BaseMediaRepository } from './base-media.repository';

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
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.repository.find({
      where: { album },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByArtistAndUser(
    artist: string,
    user: string,
    limit: number = 10,
  ): Promise<Track[]> {
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
}
