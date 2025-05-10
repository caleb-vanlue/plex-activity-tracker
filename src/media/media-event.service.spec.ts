// src/media/__tests__/media-event.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { MediaSessionManager } from './managers/media-session.manager';
import { MediaEventService } from './media-event.service';
import { EpisodeProcessor } from './processors/episode.processor';
import { MediaProcessorFactory } from './processors/media-processor.factory';
import { MovieProcessor } from './processors/movie.processor';
import { TrackProcessor } from './processors/track.processor';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';

describe('MediaEventService', () => {
  let service: MediaEventService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let userRepository: jest.Mocked<UserRepository>;
  let mediaSessionManager: jest.Mocked<MediaSessionManager>;
  let mediaProcessorFactory: jest.Mocked<MediaProcessorFactory>;
  let trackProcessor: jest.Mocked<TrackProcessor>;
  let movieProcessor: jest.Mocked<MovieProcessor>;
  let episodeProcessor: jest.Mocked<EpisodeProcessor>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    const eventEmitterMock = {
      emit: jest.fn(),
    };

    const userRepositoryMock = {
      findOrCreate: jest.fn(),
    };

    const mediaSessionManagerMock = {
      initialize: jest.fn(),
      getCurrentMedia: jest.fn(),
      getActiveUsers: jest.fn(),
    };

    const trackProcessorMock = {
      processEvent: jest.fn(),
    };

    const movieProcessorMock = {
      processEvent: jest.fn(),
    };

    const episodeProcessorMock = {
      processEvent: jest.fn(),
    };

    const mediaProcessorFactoryMock = {
      getProcessor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEventService,
        { provide: EventEmitter2, useValue: eventEmitterMock },
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: MediaSessionManager, useValue: mediaSessionManagerMock },
        { provide: MediaProcessorFactory, useValue: mediaProcessorFactoryMock },
        { provide: TrackProcessor, useValue: trackProcessorMock },
        { provide: MovieProcessor, useValue: movieProcessorMock },
        { provide: EpisodeProcessor, useValue: episodeProcessorMock },
      ],
    }).compile();

    // Suppress console logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    service = module.get<MediaEventService>(MediaEventService);
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    mediaSessionManager = module.get(
      MediaSessionManager,
    ) as jest.Mocked<MediaSessionManager>;
    mediaProcessorFactory = module.get(
      MediaProcessorFactory,
    ) as jest.Mocked<MediaProcessorFactory>;
    trackProcessor = module.get(TrackProcessor) as jest.Mocked<TrackProcessor>;
    movieProcessor = module.get(MovieProcessor) as jest.Mocked<MovieProcessor>;
    episodeProcessor = module.get(
      EpisodeProcessor,
    ) as jest.Mocked<EpisodeProcessor>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize mediaSessionManager', async () => {
      await service.onModuleInit();
      expect(mediaSessionManager.initialize).toHaveBeenCalled();
    });
  });

  describe('processPlexWebhook', () => {
    it('should return null if no metadata type is provided', async () => {
      const payload = {
        event: 'media.play',
        Account: { title: 'testUser' },
        // No Metadata field
      };

      const result = await service.processPlexWebhook(payload, null);
      expect(result).toBeNull();
    });

    it('should return null if no user information is provided', async () => {
      const payload = {
        event: 'media.play',
        Metadata: { type: 'track' },
        // No Account field
      };

      const result = await service.processPlexWebhook(payload, null);
      expect(result).toBeNull();
    });

    it('should process track events', async () => {
      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
        Account: { title: 'testUser' },
      };

      const user = { id: 'user-123', title: 'testUser' };
      const expectedResult = {
        track: { id: 'track-123', title: 'Test Track' },
        session: { id: 'session-123', state: 'playing' },
      };

      userRepository.findOrCreate.mockResolvedValue(user as User);
      mediaProcessorFactory.getProcessor.mockReturnValue(trackProcessor);
      trackProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await service.processPlexWebhook(payload, 'thumb-123');

      expect(userRepository.findOrCreate).toHaveBeenCalledWith('testUser');
      expect(mediaProcessorFactory.getProcessor).toHaveBeenCalledWith('track');
      expect(trackProcessor.processEvent).toHaveBeenCalledWith(
        payload,
        'playing',
        'thumb-123',
        'user-123',
      );
      expect(result).toEqual(expectedResult);
    });

    it('should process movie events', async () => {
      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'movie',
          title: 'Test Movie',
          year: 2023,
        },
        Account: { title: 'testUser' },
      };

      const user = { id: 'user-123', title: 'testUser' };
      const expectedResult = {
        movie: { id: 'movie-123', title: 'Test Movie' },
        session: { id: 'session-123', state: 'playing' },
      };

      userRepository.findOrCreate.mockResolvedValue(user as User);
      mediaProcessorFactory.getProcessor.mockReturnValue(movieProcessor);
      movieProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await service.processPlexWebhook(payload, 'thumb-123');

      expect(userRepository.findOrCreate).toHaveBeenCalledWith('testUser');
      expect(mediaProcessorFactory.getProcessor).toHaveBeenCalledWith('movie');
      expect(movieProcessor.processEvent).toHaveBeenCalledWith(
        payload,
        'playing',
        'thumb-123',
        'user-123',
      );
      expect(result).toEqual(expectedResult);
    });

    it('should process episode events', async () => {
      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'episode',
          title: 'Test Episode',
          grandparentTitle: 'Test Show',
          parentIndex: 1,
          index: 1,
        },
        Account: { title: 'testUser' },
      };

      const user = { id: 'user-123', title: 'testUser' };
      const expectedResult = {
        episode: { id: 'episode-123', title: 'Test Episode' },
        session: { id: 'session-123', state: 'playing' },
      };

      userRepository.findOrCreate.mockResolvedValue(user as User);
      mediaProcessorFactory.getProcessor.mockReturnValue(episodeProcessor);
      episodeProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await service.processPlexWebhook(payload, 'thumb-123');

      expect(userRepository.findOrCreate).toHaveBeenCalledWith('testUser');
      expect(mediaProcessorFactory.getProcessor).toHaveBeenCalledWith(
        'episode',
      );
      expect(episodeProcessor.processEvent).toHaveBeenCalledWith(
        payload,
        'playing',
        'thumb-123',
        'user-123',
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors during processing', async () => {
      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          title: 'Test Track',
        },
        Account: { title: 'testUser' },
      };

      const user = { id: 'user-123', title: 'testUser' };

      userRepository.findOrCreate.mockResolvedValue(user as User);
      mediaProcessorFactory.getProcessor.mockReturnValue(trackProcessor);
      trackProcessor.processEvent.mockRejectedValue(new Error('Test error'));

      const result = await service.processPlexWebhook(payload, 'thumb-123');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentMedia', () => {
    it('should call mediaSessionManager.getCurrentMedia', async () => {
      const expectedResult = { tracks: [], movies: [], episodes: [] };
      mediaSessionManager.getCurrentMedia.mockResolvedValue(expectedResult);

      const result = await service.getCurrentMedia('all', 'user-123');

      expect(mediaSessionManager.getCurrentMedia).toHaveBeenCalledWith(
        'all',
        'user-123',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getActiveUsers', () => {
    it('should call mediaSessionManager.getActiveUsers', () => {
      const expectedResult = ['user-1', 'user-2'];
      mediaSessionManager.getActiveUsers.mockReturnValue(expectedResult);

      const result = service.getActiveUsers();

      expect(mediaSessionManager.getActiveUsers).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('mapEventToState', () => {
    it('should map play events to playing state', () => {
      expect(service['mapEventToState']('media.play')).toBe('playing');
      expect(service['mapEventToState']('media.resume')).toBe('playing');
      expect(service['mapEventToState']('media.scrobble')).toBe('playing');
      expect(service['mapEventToState']('playback.started')).toBe('playing');
    });

    it('should map pause events to paused state', () => {
      expect(service['mapEventToState']('media.pause')).toBe('paused');
    });

    it('should map stop events to stopped state', () => {
      expect(service['mapEventToState']('media.stop')).toBe('stopped');
    });

    it('should map unknown events to unknown state', () => {
      expect(service['mapEventToState']('unknown.event')).toBe('unknown');
    });
  });
});
