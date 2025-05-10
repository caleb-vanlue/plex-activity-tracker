import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EpisodeRepository } from '../repositories/episode.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { AbstractMediaProcessor } from './abstract-media.processor';

@Injectable()
export class EpisodeProcessor extends AbstractMediaProcessor {
  constructor(
    private episodeRepository: EpisodeRepository,
    private userMediaSessionRepository: UserMediaSessionRepository,
    eventEmitter: EventEmitter2,
  ) {
    super(eventEmitter, EpisodeProcessor.name, 'episode');
  }

  async processEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    const now = new Date();

    const episodeData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      showTitle: payload.Metadata.grandparentTitle,
      season: payload.Metadata.parentIndex,
      episode: payload.Metadata.index,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let episode = await this.episodeRepository.findByRatingKey(
      episodeData.ratingKey,
    );
    if (!episode) {
      episode = await this.episodeRepository.create(episodeData);
      this.logger.log(
        `Created new episode metadata: ${episode.title} (${episode.showTitle} S${episode.season}E${episode.episode})`,
      );
    }

    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'episode',
      episode.id,
    );

    if (state === 'playing') {
      // Stop other playing episodes
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveEpisodes(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== episode.id) {
          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });
        }
      }

      // Create or update current session
      if (!session) {
        session = await this.userMediaSessionRepository.create({
          userId,
          mediaType: 'episode',
          mediaId: episode.id,
          episode,
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
      type: 'episode',
      episodeId: episode.id,
      sessionId: session?.id,
      title: episode.title,
      showTitle: episode.showTitle,
      season: episode.season,
      episode: episode.episode,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.videoEvent', eventData);

    return { episode, session };
  }
}
