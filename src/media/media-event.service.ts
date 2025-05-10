import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository } from './repositories/user.repository';
import { MediaSessionManager } from './managers/media-session.manager';
import { MediaProcessorFactory } from './processors/media-processor.factory';

@Injectable()
export class MediaEventService implements OnModuleInit {
  private readonly logger = new Logger(MediaEventService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private userRepository: UserRepository,
    private mediaSessionManager: MediaSessionManager,
    private mediaProcessorFactory: MediaProcessorFactory,
  ) {}

  async onModuleInit() {
    await this.mediaSessionManager.initialize();
  }

  async processPlexWebhook(
    payload: any,
    thumbnailId: string | null,
  ): Promise<any> {
    if (!payload.Metadata?.type) {
      this.logger.warn('Received webhook without metadata type');
      return null;
    }

    const eventType = payload.event;
    const mediaType = payload.Metadata.type;
    const state = this.mapEventToState(eventType);
    const userName = payload.Account?.title;

    if (!userName) {
      this.logger.warn('Received webhook without user information');
      return null;
    }

    const user = await this.userRepository.findOrCreate(userName);

    this.logger.debug(
      `Processing ${mediaType} event: ${eventType} for ${payload.Metadata?.title} by user ${user.title}`,
    );

    try {
      const processor = this.mediaProcessorFactory.getProcessor(mediaType);

      const result = await processor.processEvent(
        payload,
        state,
        thumbnailId,
        user.id,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing ${mediaType} event: ${error.message}`,
      );
      return null;
    }
  }

  public async getCurrentMedia(type: string, userId?: string): Promise<any> {
    return this.mediaSessionManager.getCurrentMedia(type, userId);
  }

  public getActiveUsers(): string[] {
    return this.mediaSessionManager.getActiveUsers();
  }

  private mapEventToState(event: string): string {
    switch (event) {
      case 'media.play':
      case 'media.resume':
      case 'media.scrobble':
      case 'playback.started':
        return 'playing';
      case 'media.pause':
        return 'paused';
      case 'media.stop':
        return 'stopped';
      default:
        return 'unknown';
    }
  }
}
