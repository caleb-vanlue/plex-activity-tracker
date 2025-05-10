import { ObjectLiteral } from 'typeorm';

export interface BaseMedia extends ObjectLiteral {
  id: string;
  ratingKey: string;
  title: string;
  thumbnailFileId?: string | null;
  raw?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Track extends BaseMedia {
  artist: string;
  album: string;
}

export interface Movie extends BaseMedia {
  year?: number;
  director?: string;
  studio?: string;
  duration?: number;
  summary?: string;
}

export interface Episode extends BaseMedia {
  showTitle: string;
  season: number;
  episode: number;
  duration?: number;
  summary?: string;
}

export type MediaType = 'track' | 'movie' | 'episode';

export interface User {
  id: string;
  title: string;
}
