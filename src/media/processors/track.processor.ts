import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from '../repositories/track.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { AbstractMediaProcessor } from './abstract-media.processor';
import { SessionStateEnum } from 'src/common/constants/media.constants';

@Injectable()
export class TrackProcessor extends AbstractMediaProcessor {
  constructor(
    private trackRepository: TrackRepository,
    private userMediaSessionRepository: UserMediaSessionRepository,
    eventEmitter: EventEmitter2,
  ) {
    super(eventEmitter, TrackProcessor.name, 'track');
  }

  async processEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    const now = new Date();

    const trackData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      artist: payload.Metadata.grandparentTitle,
      album: payload.Metadata.parentTitle,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let track = await this.trackRepository.findByRatingKey(trackData.ratingKey);
    if (!track) {
      track = await this.trackRepository.create(trackData);
      this.logger.log(
        `Created new track metadata: ${track.title} by ${track.artist}`,
      );
    }

    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'track',
      track.id,
    );

    if (state === 'playing') {
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveTracks(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== track.id) {
          this.logger.debug(
            `Stopping track ${activeSession.track?.title} for user ${userId} because a new track started playing`,
          );

          const eventData = {
            type: 'track',
            trackId: activeSession.track.id,
            sessionId: activeSession?.id,
            title: activeSession.track.title,
            artist: activeSession.track.artist,
            album: activeSession.track.album,
            state: SessionStateEnum.STOPPED,
            userId,
            player: payload.Player?.title,
            timestamp: now.toISOString(),
          };

          this.eventEmitter.emit('plex.trackEvent', eventData);

          const endTime = now;
          const sessionTime =
            endTime.getTime() - activeSession.startTime.getTime();

          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime,
            timeWatchedMs: activeSession.timeWatchedMs + sessionTime,
          });
        }
      }

      if (!session) {
        session = await this.userMediaSessionRepository.create({
          userId,
          mediaType: 'track',
          mediaId: track.id,
          track,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title,
          timeWatchedMs: 0,
        });
      } else {
        if (session.state === 'playing' && payload.event === 'media.scrobble') {
          const sessionTime = now.getTime() - session.startTime.getTime();
          await this.userMediaSessionRepository.update(session.id, {
            timeWatchedMs: session.timeWatchedMs + sessionTime,
            startTime: now,
            state: 'playing',
            player: payload.Player?.title,
          });
        } else {
          await this.userMediaSessionRepository.update(session.id, {
            state: 'playing',
            startTime: now,
            player: payload.Player?.title,
          });
        }
        session = await this.userMediaSessionRepository.findById(session.id);
      }
    } else if (state === 'paused' || state === 'stopped') {
      if (session) {
        const sessionTime = now.getTime() - session.startTime.getTime();

        await this.userMediaSessionRepository.update(session.id, {
          state,
          endTime: now,
          timeWatchedMs: session.timeWatchedMs + sessionTime,
        });

        session = await this.userMediaSessionRepository.findById(session.id);
      }
    }

    const eventData = {
      type: 'track',
      trackId: track.id,
      sessionId: session?.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.trackEvent', eventData);

    return { track, session };
  }
}
