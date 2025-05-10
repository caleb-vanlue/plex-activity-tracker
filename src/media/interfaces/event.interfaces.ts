import { MediaType } from 'src/common/interfaces/media.interfaces';
import { MediaSession } from 'src/media/interfaces/session.interfaces';

export interface PlexMetadata {
  type: MediaType;
  ratingKey: string;
  title: string;
  parentTitle?: string;
  parentIndex?: number;
  grandparentTitle?: string;
  index?: number;
  year?: number;
  duration?: number;
  summary?: string;
  studio?: string;
  Director?: any;
}

export interface PlexPlayer {
  title: string;
  uuid?: string;
}

export interface PlexAccount {
  title: string;
  id?: string;
}

export interface PlexWebhookPayload {
  event: string;
  Account?: PlexAccount;
  Player?: PlexPlayer;
  Metadata?: PlexMetadata;
  [key: string]: any;
}

export interface MediaEventResult<T> {
  media: T;
  session?: MediaSession;
}

export interface MediaProcessor<T> {
  processEvent(
    payload: PlexWebhookPayload,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<MediaEventResult<T>>;
}
