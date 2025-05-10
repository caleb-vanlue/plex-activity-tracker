import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class AbstractMediaProcessor {
  protected readonly logger: Logger;

  constructor(
    protected readonly eventEmitter: EventEmitter2,
    protected readonly processorName: string,
    protected readonly mediaType: 'track' | 'movie' | 'episode',
  ) {
    this.logger = new Logger(processorName);
  }

  abstract processEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any>;

  mapEventToState(event: string): string {
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
