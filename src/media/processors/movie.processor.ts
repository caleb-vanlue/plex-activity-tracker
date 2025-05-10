import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MovieRepository } from '../repositories/movie.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { AbstractMediaProcessor } from './abstract-media.processor';

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

    if (state === 'playing') {
      const activeSessions =
        await this.userMediaSessionRepository.findAllActiveMovies(userId);

      for (const activeSession of activeSessions) {
        if (activeSession.mediaId !== movie.id) {
          await this.userMediaSessionRepository.update(activeSession.id, {
            state: 'stopped',
            endTime: now,
            timeWatchedMs:
              activeSession.timeWatchedMs +
              (now.getTime() - activeSession.startTime.getTime()),
          });
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
