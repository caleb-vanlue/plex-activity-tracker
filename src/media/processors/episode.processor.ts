import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EpisodeRepository } from '../repositories/episode.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { AbstractMediaProcessor } from './abstract-media.processor';
import { SessionStateEnum } from '../../common/constants/media.constants';

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
    this.logger.debug(
      `Found session for episode ${episode.title}: ${!!session ? session.id : 'none'}, state: ${session?.state || 'N/A'}`,
    );

    if (state === 'playing') {
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveEpisodes(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== episode.id) {
          this.logger.debug(
            `Stopping episode ${activeSession.episode?.title} for user ${userId} because a new episode started playing`,
          );

          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });

          const eventData = {
            type: 'episode',
            episodeId: activeSession.episode.id,
            sessionId: activeSession?.id,
            title: activeSession.episode.title,
            showTitle: activeSession.episode.showTitle,
            season: activeSession.episode.season,
            episode: activeSession.episode.episode,
            state: SessionStateEnum.STOPPED,
            userId,
            player: payload.Player?.title,
            timestamp: now.toISOString(),
          };

          this.eventEmitter.emit('plex.videoEvent', eventData);
        }
      }

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
        this.logger.debug(
          `Created new session for episode ${episode.title} for user ${userId}`,
        );
      } else if (session.state === 'paused') {
        this.logger.debug(
          `Resuming paused episode ${episode.title} for user ${userId}`,
        );
        await this.userMediaSessionRepository.update(session.id, {
          state: 'playing',
          startTime: now,
          pausedAt: null,
          player: payload.Player?.title,
        });
      } else if (
        session.state === 'playing' &&
        payload.event === 'media.scrobble'
      ) {
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
    } else if (state === 'paused') {
      if (session) {
        if (session.state === 'playing') {
          const sessionTime = now.getTime() - session.startTime.getTime();
          this.logger.debug(
            `Pausing episode ${episode.title}, adding ${sessionTime}ms watched time`,
          );

          await this.userMediaSessionRepository.update(session.id, {
            state,
            pausedAt: now,
            timeWatchedMs: session.timeWatchedMs + sessionTime,
          });
        } else if (session.state !== 'paused') {
          await this.userMediaSessionRepository.update(session.id, {
            state: 'paused',
            pausedAt: now,
          });
        } else {
          this.logger.debug(
            `Episode ${episode.title} already paused, not adding time`,
          );
        }

        session = await this.userMediaSessionRepository.findById(session.id);
      }
    } else if (state === 'stopped') {
      if (session) {
        let sessionTime = 0;

        if (session.state === 'playing') {
          sessionTime = now.getTime() - session.startTime.getTime();
        }

        this.logger.debug(
          `Stopping episode ${episode.title}, adding ${sessionTime}ms watched time`,
        );

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
