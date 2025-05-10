import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackProcessor } from '../processors/track.processor';
import { TrackRepository } from '../repositories/track.repository';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { Track } from '../entities/track.entity';
import { UserMediaSession } from '../entities/user-media-session.entity';
import { mock, MockProxy } from 'jest-mock-extended';

describe('TrackProcessor', () => {
  let processor: TrackProcessor;
  let trackRepository: MockProxy<TrackRepository>;
  let userMediaSessionRepository: jest.Mocked<UserMediaSessionRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let loggerDebugSpy: jest.SpyInstance;

  const sessionMap = new Map<string, UserMediaSession>();

  beforeEach(async () => {
    sessionMap.clear();

    const trackRepositoryMock = {
      findByRatingKey: jest.fn(),
      create: jest.fn(),
    };

    const userMediaSessionRepositoryMock = {
      findActive: jest.fn(),
      findAllActiveTracks: jest.fn().mockResolvedValue([]),
      findAllActiveMovies: jest.fn().mockResolvedValue([]),
      findAllActiveEpisodes: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => {
        const session = {
          ...data,
          id: data.id || `session-${Math.random().toString(36).substring(7)}`,
        };
        sessionMap.set(session.id, session as UserMediaSession);
        return Promise.resolve(session as UserMediaSession);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existingSession = sessionMap.get(id);
        if (!existingSession) return Promise.resolve(null);

        const updatedSession = { ...existingSession, ...data };
        sessionMap.set(id, updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      }),
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(sessionMap.get(id) || null);
      }),
    };

    const eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackProcessor,
        { provide: TrackRepository, useValue: trackRepositoryMock },
        {
          provide: UserMediaSessionRepository,
          useValue: userMediaSessionRepositoryMock,
        },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    loggerDebugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    processor = module.get<TrackProcessor>(TrackProcessor);
    trackRepository = module.get(TrackRepository);
    userMediaSessionRepository = module.get(UserMediaSessionRepository);
    eventEmitter = module.get(EventEmitter2);

    trackRepository.create.mockImplementation((trackData) =>
      Promise.resolve({
        id: 'mock-track-id',
        ratingKey: trackData.ratingKey,
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album,
        thumbnailFileId: trackData.thumbnailFileId,
        raw: trackData.raw,
      } as Track),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('processEvent', () => {
    const mockUserId = 'user-123';
    const mockDate = new Date('2023-01-01T12:00:00Z');
    const mockPayload = {
      event: 'media.play',
      Metadata: {
        ratingKey: 'track-rating-123',
        type: 'track',
        title: 'Test Track',
        grandparentTitle: 'Test Artist',
        parentTitle: 'Test Album',
      },
      Player: {
        title: 'Test Player',
      },
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a new track if it does not exist', async () => {
      trackRepository.findByRatingKey.mockResolvedValue(null);

      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'mock-track-id',
        track: {
          id: 'mock-track-id',
          title: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          ratingKey: 'track-rating-123',
          thumbnailFileId: 'thumb-123',
          raw: mockPayload,
        },
        state: 'playing',
        startTime: mockDate,
        timeWatchedMs: 0,
      };

      userMediaSessionRepository.create.mockImplementation(() => {
        sessionMap.set('session-123', mockSession as UserMediaSession);
        return Promise.resolve(mockSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(trackRepository.findByRatingKey).toHaveBeenCalledWith(
        'track-rating-123',
      );
      expect(trackRepository.create).toHaveBeenCalledWith({
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        thumbnailFileId: 'thumb-123',
        raw: mockPayload,
      });

      expect(userMediaSessionRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'mock-track-id',
        track: {
          id: 'mock-track-id',
          title: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          ratingKey: 'track-rating-123',
          thumbnailFileId: 'thumb-123',
          raw: mockPayload,
        },
        state: 'playing',
        startTime: mockDate,
        player: 'Test Player',
        timeWatchedMs: 0,
      });

      expect(result).toEqual({
        track: {
          id: 'mock-track-id',
          title: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          ratingKey: 'track-rating-123',
          thumbnailFileId: 'thumb-123',
          raw: mockPayload,
        },
        session: mockSession,
      });
    });

    it('should use existing track if found', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      userMediaSessionRepository.findActive.mockResolvedValue(null);
      userMediaSessionRepository.findAllActiveTracks.mockResolvedValue([]);

      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: mockDate,
        timeWatchedMs: 0,
      };

      userMediaSessionRepository.create.mockImplementation(() => {
        sessionMap.set('session-123', mockSession as UserMediaSession);
        return Promise.resolve(mockSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(trackRepository.findByRatingKey).toHaveBeenCalledWith(
        'track-rating-123',
      );
      expect(trackRepository.create).not.toHaveBeenCalled();

      expect(userMediaSessionRepository.findActive).toHaveBeenCalledWith(
        mockUserId,
        'track',
        'track-123',
      );

      expect(userMediaSessionRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: mockDate,
        player: 'Test Player',
        timeWatchedMs: 0,
      });

      expect(result).toEqual({
        track: mockTrack,
        session: mockSession,
      });
    });

    it('should stop other active tracks when playing a new track', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      userMediaSessionRepository.findActive.mockResolvedValue(null);

      const mockOtherSession = {
        id: 'other-session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'other-track-123',
        track: {
          id: 'other-track-123',
          title: 'Other Track',
        },
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 0,
      };
      userMediaSessionRepository.findAllActiveTracks.mockResolvedValue([
        mockOtherSession as UserMediaSession,
      ]);
      sessionMap.set('other-session-123', mockOtherSession as UserMediaSession);

      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: mockDate,
        timeWatchedMs: 0,
      };

      userMediaSessionRepository.create.mockImplementation(() => {
        sessionMap.set('session-123', mockSession as UserMediaSession);
        return Promise.resolve(mockSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'other-session-123',
        {
          state: 'stopped',
          endTime: mockDate,
          timeWatchedMs: 60000,
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: mockSession,
      });
    });

    it('should update an existing session when continuing playback', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      userMediaSessionRepository.findAllActiveTracks.mockResolvedValue([
        existingSession as UserMediaSession,
      ]);
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        startTime: mockDate,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          state: 'playing',
          startTime: mockDate,
          player: 'Test Player',
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should update time watched when a scrobble event happens', async () => {
      const scrobblePayload = {
        ...mockPayload,
        event: 'media.scrobble',
      };

      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      userMediaSessionRepository.findAllActiveTracks.mockResolvedValue([
        existingSession as UserMediaSession,
      ]);
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        startTime: mockDate,
        timeWatchedMs: 180000,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        scrobblePayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          timeWatchedMs: 180000,
          startTime: mockDate,
          state: 'playing',
          player: 'Test Player',
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should pause an existing session and set pausedAt instead of endTime', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        state: 'paused',
        pausedAt: mockDate,
        timeWatchedMs: 180000,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'paused',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          state: 'paused',
          pausedAt: mockDate,
          timeWatchedMs: 180000,
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should not update timeWatchedMs when pausing an already paused session', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'paused',
        startTime: new Date(mockDate.getTime() - 120000),
        pausedAt: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const result = await processor.processEvent(
        mockPayload,
        'paused',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).not.toHaveBeenCalled();

      expect(result).toEqual({
        track: mockTrack,
        session: existingSession,
      });
    });

    it('should resume playback from paused state without adding time', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'paused',
        startTime: new Date(mockDate.getTime() - 60000),
        pausedAt: new Date(mockDate.getTime() - 30000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      userMediaSessionRepository.findAllActiveTracks.mockResolvedValue([
        existingSession as UserMediaSession,
      ]);
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        state: 'playing',
        startTime: mockDate,
        pausedAt: null,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'playing',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          state: 'playing',
          startTime: mockDate,
          pausedAt: null,
          player: 'Test Player',
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should stop an existing session', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        state: 'stopped',
        endTime: mockDate,
        timeWatchedMs: 180000,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'stopped',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          state: 'stopped',
          endTime: mockDate,
          timeWatchedMs: 180000,
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should stop a paused session without adding more time', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      const existingSession = {
        id: 'session-123',
        userId: mockUserId,
        mediaType: 'track',
        mediaId: 'track-123',
        track: mockTrack,
        state: 'paused',
        startTime: new Date(mockDate.getTime() - 120000),
        pausedAt: new Date(mockDate.getTime() - 60000),
        timeWatchedMs: 120000,
      };
      userMediaSessionRepository.findActive.mockResolvedValue(
        existingSession as UserMediaSession,
      );
      sessionMap.set('session-123', existingSession as UserMediaSession);

      const updatedSession = {
        ...existingSession,
        state: 'stopped',
        endTime: mockDate,
        timeWatchedMs: 120000,
      };

      userMediaSessionRepository.update.mockImplementation(() => {
        sessionMap.set('session-123', updatedSession as UserMediaSession);
        return Promise.resolve(updatedSession as UserMediaSession);
      });

      const result = await processor.processEvent(
        mockPayload,
        'stopped',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        {
          state: 'stopped',
          endTime: mockDate,
          timeWatchedMs: 120000,
        },
      );

      expect(result).toEqual({
        track: mockTrack,
        session: updatedSession,
      });
    });

    it('should handle pausing/stopping when no active session exists', async () => {
      const mockTrack = {
        id: 'track-123',
        ratingKey: 'track-rating-123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      trackRepository.findByRatingKey.mockResolvedValue(mockTrack as Track);

      userMediaSessionRepository.findActive.mockResolvedValue(null);

      const result = await processor.processEvent(
        mockPayload,
        'paused',
        'thumb-123',
        mockUserId,
      );

      expect(userMediaSessionRepository.update).not.toHaveBeenCalled();
      expect(userMediaSessionRepository.create).not.toHaveBeenCalled();

      expect(result).toEqual({
        track: mockTrack,
        session: null,
      });
    });
  });
});
