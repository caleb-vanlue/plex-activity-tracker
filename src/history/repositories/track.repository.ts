import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from '../entities/track.entity';

@Injectable()
export class TrackRepository {
  constructor(
    @InjectRepository(Track)
    private trackRepo: Repository<Track>,
  ) {}

  async createTrack(trackData: Partial<Track>): Promise<Track> {
    const track = this.trackRepo.create(trackData);
    return this.trackRepo.save(track);
  }

  async updateTrack(
    id: string,
    trackData: Partial<Track>,
  ): Promise<Track | null> {
    await this.trackRepo.update(id, trackData);
    return this.trackRepo.findOne({ where: { id } });
  }

  async findOne(options: any): Promise<Track | null> {
    return this.trackRepo.findOne(options);
  }

  async find(options: any): Promise<Track[]> {
    return this.trackRepo.find(options);
  }

  async query(queryString: string, parameters?: any[]): Promise<any> {
    return this.trackRepo.query(queryString, parameters);
  }

  async findByRatingKey(ratingKey: string): Promise<Track | null> {
    return this.trackRepo.findOne({ where: { ratingKey } });
  }

  async findRecentTracks(limit: number = 10): Promise<Track[]> {
    return this.trackRepo.find({
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByArtist(artist: string, limit: number = 10): Promise<Track[]> {
    return this.trackRepo.find({
      where: { artist },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findByAlbum(album: string, limit: number = 10): Promise<Track[]> {
    return this.trackRepo.find({
      where: { album },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getListeningStats(
    timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
  ): Promise<any> {
    let dateCondition = '';

    switch (timeframe) {
      case 'day':
        dateCondition = 'AND t."startTime" > NOW() - INTERVAL \'1 day\'';
        break;
      case 'week':
        dateCondition = 'AND t."startTime" > NOW() - INTERVAL \'7 days\'';
        break;
      case 'month':
        dateCondition = 'AND t."startTime" > NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateCondition = '';
    }

    const query = `
      SELECT 
        artist,
        COUNT(*) as play_count,
        SUM("listenedMs") as total_listened_ms
      FROM tracks t
      WHERE "listenedMs" IS NOT NULL ${dateCondition}
      GROUP BY artist
      ORDER BY total_listened_ms DESC
      LIMIT 10
    `;

    return this.trackRepo.query(query);
  }
}
