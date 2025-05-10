import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SessionStateEnum,
  EVENT_TO_STATE_MAP,
} from '../../common/constants/media.constants';
import { SessionState } from 'http2';
import { BaseMedia, MediaType } from 'src/common/interfaces/media.interfaces';
import {
  MediaProcessor,
  PlexWebhookPayload,
  MediaEventResult,
} from '../interfaces/event.interfaces';

export abstract class BaseMediaProcessor<T extends BaseMedia>
  implements MediaProcessor<T>
{
  protected readonly logger: Logger;

  constructor(
    protected readonly eventEmitter: EventEmitter2,
    protected readonly processorName: string,
    protected readonly mediaType: MediaType,
  ) {
    this.logger = new Logger(processorName);
  }

  /**
   * Find or create a media entity by its rating key
   */
  protected abstract findByRatingKey(ratingKey: string): Promise<T | null>;
  protected abstract createMediaEntity(data: Partial<T>): Promise<T>;

  /**
   * Find an active session for the given user and media
   */
  protected abstract findActiveSession(
    userId: string,
    mediaId: string,
  ): Promise<MediaSession | null>;

  /**
   * Create a new media session
   */
  protected abstract createSession(
    data: Partial<MediaSession>,
  ): Promise<MediaSession>;

  /**
   * Update an existing media session
   */
  protected abstract updateSession(
    id: string,
    data: Partial<MediaSession>,
  ): Promise<MediaSession | null>;

  /**
   * Stop any other active sessions for this user and media type
   */
  protected abstract stopActiveSessionsExcept(
    userId: string,
    mediaId: string,
  ): Promise<void>;

  /**
   * Create event data for emitting
   */
  protected abstract createEventData(
    media: T,
    session: MediaSession | null,
    state: string,
    userId: string,
    player?: string,
  ): any;

  /**
   * Process a media event from Plex
   */
  public async processEvent(
    payload: PlexWebhookPayload,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<MediaEventResult<T>> {
    if (!payload.Metadata) {
      this.logger.warn('Received webhook without metadata');
      throw new Error('Missing metadata in webhook payload');
    }

    const now = new Date();

    // Create or update the media entity
    const mediaData = this.extractMediaData(payload, thumbnailId);

    // Ensure ratingKey is a string (TypeScript safety)
    if (!mediaData.ratingKey || typeof mediaData.ratingKey !== 'string') {
      throw new Error('Missing or invalid rating key in payload');
    }

    // Find or create the media entity
    let media = await this.findByRatingKey(mediaData.ratingKey);
    if (!media) {
      media = await this.createMediaEntity(mediaData);
      this.logger.log(
        `Created new ${this.mediaType} metadata: ${mediaData.title}`,
      );
    }

    // Find existing session for this media and user
    let session = await this.findActiveSession(userId, media.id);

    if (state === SessionStateEnum.PLAYING) {
      // Stop any other playing media for this user
      await this.stopActiveSessionsExcept(userId, media.id);

      // Create or update current session
      if (!session) {
        session = await this.createSession({
          userId,
          mediaType: this.mediaType,
          mediaId: media.id,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title || null,
          timeWatchedMs: 0,
          endTime: null,
        });
      } else {
        if (session.state === 'playing' && payload.event === 'media.scrobble') {
          // Calculate watched time before restarting
          const sessionTime = now.getTime() - session.startTime.getTime();
          session = await this.updateSession(session.id, {
            timeWatchedMs: session.timeWatchedMs + sessionTime,
            startTime: now,
            state: 'playing',
            player: payload.Player?.title || null,
          });
        } else {
          session = await this.updateSession(session.id, {
            state: 'playing',
            startTime: now,
            player: payload.Player?.title || null,
          });
        }
      }
    } else if (
      state === SessionStateEnum.PAUSED ||
      state === SessionStateEnum.STOPPED
    ) {
      if (session) {
        const endTime = now;
        const sessionTime = endTime.getTime() - session.startTime.getTime();

        session = await this.updateSession(session.id, {
          state,
          endTime,
          timeWatchedMs: session.timeWatchedMs + sessionTime,
        });
      }
    }

    // Emit event with session details
    const eventData = this.createEventData(
      media,
      session,
      state,
      userId,
      payload.Player?.title,
    );

    // Emit the appropriate event based on media type
    this.emitEvent(eventData);

    return { media, session };
  }

  /**
   * Map Plex event to session state
   */
  public mapEventToState(event: string): SessionState {
    return EVENT_TO_STATE_MAP[event] || SessionStateEnum.UNKNOWN;
  }

  /**
   * Extract media data from payload
   */
  protected abstract extractMediaData(
    payload: PlexWebhookPayload,
    thumbnailId: string | null,
  ): Partial<T>;

  /**
   * Emit event to the event emitter
   */
  protected abstract emitEvent(eventData: any): void;
}
