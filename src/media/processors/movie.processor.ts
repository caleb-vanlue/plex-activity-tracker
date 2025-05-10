import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MovieRepository } from '../repositories/movie.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { AbstractMediaProcessor } from './abstract-media.processor';
import { SessionStateEnum } from '../../common/constants/media.constants';

@Injectable()
export class MovieProcessor extends AbstractMediaProcessor {
  constructor(
    private movieRepository: MovieRepository,
    private userMediaSessionRepository: UserMediaSessionRepository,
    eventEmitter: EventEmitter2,
  ) {
    super(eventEmitter, MovieProcessor.name, 'movie');
  }

  async processEvent(
    payload: any,
    state: string,
    thumbnailId: string | null,
    userId: string,
  ): Promise<any> {
    const now = new Date();

    const movieData = {
      ratingKey: payload.Metadata.ratingKey,
      title: payload.Metadata.title,
      year: payload.Metadata.year,
      director: this.extractDirector(payload.Metadata),
      studio: payload.Metadata.studio,
      summary: payload.Metadata.summary,
      duration: payload.Metadata.duration,
      thumbnailFileId: thumbnailId,
      raw: payload,
    };

    let movie = await this.movieRepository.findByRatingKey(movieData.ratingKey);
    if (!movie) {
      movie = await this.movieRepository.create(movieData);
      this.logger.log(
        `Created new movie metadata: ${movie.title} (${movie.year})`,
      );
    }

    let session = await this.userMediaSessionRepository.findActive(
      userId,
      'movie',
      movie.id,
    );
    this.logger.debug(
      `Found session for movie ${movie.title}: ${!!session ? session.id : 'none'}, state: ${session?.state || 'N/A'}`,
    );

    if (state === 'playing') {
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveMovies(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== movie.id) {
          this.logger.debug(
            `Stopping movie ${activeSession.movie?.title} for user ${userId} because a new movie started playing`,
          );

          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });

          const eventData = {
            type: 'movie',
            movieId: activeSession.movie.id,
            sessionId: activeSession?.id,
            title: activeSession.movie.title,
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
          mediaType: 'movie',
          mediaId: movie.id,
          movie,
          state: 'playing',
          startTime: now,
          player: payload.Player?.title,
          timeWatchedMs: 0,
        });
        this.logger.debug(
          `Created new session for movie ${movie.title} for user ${userId}`,
        );
      } else if (session.state === 'paused') {
        this.logger.debug(
          `Resuming paused movie ${movie.title} for user ${userId}`,
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
            `Pausing movie ${movie.title}, adding ${sessionTime}ms watched time`,
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
            `Movie ${movie.title} already paused, not adding time`,
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
          `Stopping movie ${movie.title}, adding ${sessionTime}ms watched time`,
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
      type: 'movie',
      movieId: movie.id,
      sessionId: session?.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      studio: movie.studio,
      state,
      userId,
      player: payload.Player?.title,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit('plex.videoEvent', eventData);

    return { movie, session };
  }

  private extractDirector(metadata: any): string | null {
    if (!metadata || !metadata.Director) {
      return null;
    }

    if (Array.isArray(metadata.Director)) {
      return metadata.Director.map((d: any) => d.tag || d.name || d).join(', ');
    }

    if (typeof metadata.Director === 'object') {
      return metadata.Director.tag || metadata.Director.name || null;
    }

    return String(metadata.Director);
  }
}
