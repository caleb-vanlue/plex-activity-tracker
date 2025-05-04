import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private currentTrack: any = null;

  @OnEvent('plex.trackEvent')
  async handleTrackEvent(event: any) {
    try {
      this.logger.log(
        `Received track event: ${event.state} for "${event.title}" by ${event.artist}`,
      );

      switch (event.state) {
        case 'playing':
          await this.handlePlayingState(event);
          break;
        case 'paused':
          await this.handlePausedState(event);
          break;
        case 'stopped':
          await this.handleStoppedState(event);
          break;
        default:
          this.logger.log(`Unknown state: ${event.state}`);
      }
    } catch (error) {
      this.logger.error(`Error handling track event: ${error.message}`);
    }
  }

  private async handlePlayingState(event: any) {
    if (!this.currentTrack || this.currentTrack.ratingKey !== event.ratingKey) {
      this.currentTrack = {
        ...event,
        startTime: new Date(),
      };

      this.logger.log('=== TRACK STARTED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(`Album: ${event.album}`);
      this.logger.log(`User: ${event.user}`);
      this.logger.log(`Player: ${event.player}`);
      this.logger.log(`Start time: ${new Date().toISOString()}`);
    } else {
      this.currentTrack.state = 'playing';
      this.logger.log(`Track resumed: "${event.title}" by ${event.artist}`);
    }
  }

  private async handlePausedState(event: any) {
    if (this.currentTrack && this.currentTrack.ratingKey === event.ratingKey) {
      this.currentTrack.state = 'paused';
      this.currentTrack.pausedAt = new Date();

      this.logger.log('=== TRACK PAUSED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(`Paused at: ${new Date().toISOString()}`);
    }
  }

  private async handleStoppedState(event: any) {
    if (this.currentTrack && this.currentTrack.ratingKey === event.ratingKey) {
      const endTime = new Date();
      const startTime = new Date(this.currentTrack.startTime);
      let listenedMs = endTime.getTime() - startTime.getTime();

      this.logger.log('=== TRACK STOPPED ===');
      this.logger.log(`Title: ${event.title}`);
      this.logger.log(`Artist: ${event.artist}`);
      this.logger.log(
        `Duration listened: ${Math.floor(listenedMs / 1000)} seconds`,
      );
      this.logger.log(`Stopped at: ${endTime.toISOString()}`);

      this.currentTrack = null;
    }
  }

  async getCurrentTrack() {
    return this.currentTrack || { state: 'idle' };
  }
}
