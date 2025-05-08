import { Test, TestingModule } from '@nestjs/testing';
import { MediaEventService } from './media-event.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Logger } from '@nestjs/common';
import { Episode } from './entities/episode.entity';
import { Movie } from './entities/movie.entity';
import { Track } from './entities/track.entity';

describe('MediaEventService', () => {
  let service: MediaEventService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockDate = new Date('2025-05-06T12:00:00Z');

  beforeEach(async () => {
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const mockTrackRepo = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockMovieRepo = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEpisodeRepo = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEventService,
        {
          provide: TrackRepository,
          useValue: mockTrackRepo,
        },
        {
          provide: MovieRepository,
          useValue: mockMovieRepo,
        },
        {
          provide: EpisodeRepository,
          useValue: mockEpisodeRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MediaEventService>(MediaEventService);
    trackRepository = module.get(
      TrackRepository,
    ) as jest.Mocked<TrackRepository>;
    movieRepository = module.get(
      MovieRepository,
    ) as jest.Mocked<MovieRepository>;
    episodeRepository = module.get(
      EpisodeRepository,
    ) as jest.Mocked<EpisodeRepository>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('mapEventToState', () => {
    it('should map media.play to playing state', () => {
      expect((service as any).mapEventToState('media.play')).toBe('playing');
    });

    it('should map media.resume to playing state', () => {
      expect((service as any).mapEventToState('media.resume')).toBe('playing');
    });

    it('should map media.scrobble to playing state', () => {
      expect((service as any).mapEventToState('media.scrobble')).toBe(
        'playing',
      );
    });

    it('should map media.pause to paused state', () => {
      expect((service as any).mapEventToState('media.pause')).toBe('paused');
    });

    it('should map media.stop to stopped state', () => {
      expect((service as any).mapEventToState('media.stop')).toBe('stopped');
    });

    it('should map unknown event to unknown state', () => {
      expect((service as any).mapEventToState('media.unknown')).toBe('unknown');
    });
  });

  describe('processTrackEvent', () => {
    const oneMinuteAgo = new Date(mockDate.getTime() - 60000);
    const trackPayload = {
      event: 'media.play',
      Metadata: {
        type: 'track',
        ratingKey: '123',
        title: 'Test Track',
        grandparentTitle: 'Test Artist',
        parentTitle: 'Test Album',
      },
      Account: { title: 'Test User' },
      Player: { title: 'Test Player' },
    };

    it('should create a new track if it does not exist', async () => {
      const mockTrack = {
        id: '1',
        ratingKey: '123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        startTime: mockDate,
      };

      trackRepository.findByRatingKey.mockResolvedValue(null);
      trackRepository.create.mockResolvedValue(mockTrack as Track);

      const result = await (service as any).processTrackEvent(
        trackPayload,
        'playing',
        null,
      );

      expect(trackRepository.findByRatingKey).toHaveBeenCalledWith('123');
      expect(trackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingKey: '123',
          title: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          state: 'playing',
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(mockTrack);
    });

    it('should update an existing track when starting playback', async () => {
      const existingTrack = {
        id: '1',
        ratingKey: '123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'stopped',
        startTime: null,
        listenedMs: 5000,
      };

      const updatedTrack = {
        ...existingTrack,
        state: 'playing',
        startTime: mockDate,
      };

      trackRepository.findByRatingKey.mockResolvedValue(
        existingTrack as unknown as Track,
      );
      trackRepository.findById.mockResolvedValue(updatedTrack as Track);

      const result = await (service as any).processTrackEvent(
        trackPayload,
        'playing',
        null,
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'playing',
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedTrack);
    });

    it('should update listenedMs when pausing playback', async () => {
      const existingTrack = {
        id: '1',
        ratingKey: '123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        startTime: oneMinuteAgo,
        listenedMs: 5000,
      };

      const updatedTrack = {
        ...existingTrack,
        state: 'paused',
        endTime: mockDate,
        listenedMs: 65000,
      };

      trackRepository.findByRatingKey.mockResolvedValue(existingTrack as Track);
      trackRepository.findById.mockResolvedValue(updatedTrack as Track);

      const pausePayload = { ...trackPayload, event: 'media.pause' };
      const result = await (service as any).processTrackEvent(
        pausePayload,
        'paused',
        null,
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'paused',
          endTime: mockDate,
          listenedMs: 65000,
        }),
      );
      expect(result).toEqual(updatedTrack);
    });

    it('should update listenedMs on scrobble without stopping playback', async () => {
      const existingTrack = {
        id: '1',
        ratingKey: '123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        startTime: oneMinuteAgo,
        listenedMs: 5000,
      };

      const updatedTrack = {
        ...existingTrack,
        state: 'playing',
        listenedMs: 65000,
        startTime: mockDate,
      };

      trackRepository.findByRatingKey.mockResolvedValue(existingTrack as Track);
      trackRepository.findById.mockResolvedValue(updatedTrack as Track);

      const scrobblePayload = { ...trackPayload, event: 'media.scrobble' };
      const result = await (service as any).processTrackEvent(
        scrobblePayload,
        'playing',
        null,
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'playing',
          listenedMs: 65000,
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedTrack);
    });
  });

  describe('processMovieEvent', () => {
    const oneMinuteAgo = new Date(mockDate.getTime() - 60000);
    const moviePayload = {
      event: 'media.play',
      Metadata: {
        type: 'movie',
        ratingKey: '456',
        title: 'Test Movie',
        year: 2025,
        Director: [{ tag: 'Test Director' }],
        studio: 'Test Studio',
        summary: 'Test Summary',
        duration: 7200,
      },
      Account: { title: 'Test User' },
      Player: { title: 'Test Player' },
    };

    it('should create a new movie if it does not exist', async () => {
      const mockMovie = {
        id: '1',
        ratingKey: '456',
        title: 'Test Movie',
        year: 2025,
        director: 'Test Director',
        studio: 'Test Studio',
        summary: 'Test Summary',
        duration: 7200,
        state: 'playing',
        startTime: mockDate,
      };

      movieRepository.findByRatingKey.mockResolvedValue(null);
      movieRepository.create.mockResolvedValue(mockMovie as Movie);

      const result = await (service as any).processMovieEvent(
        moviePayload,
        'playing',
        null,
      );

      expect(movieRepository.findByRatingKey).toHaveBeenCalledWith('456');
      expect(movieRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingKey: '456',
          title: 'Test Movie',
          year: 2025,
          director: 'Test Director',
          state: 'playing',
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(mockMovie);
    });

    it('should update watchedMs and percentComplete on scrobble', async () => {
      const existingMovie = {
        id: '1',
        ratingKey: '456',
        title: 'Test Movie',
        year: 2025,
        director: 'Test Director',
        studio: 'Test Studio',
        summary: 'Test Summary',
        duration: 7200,
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 120000,
        percentComplete: 0.0278,
      };

      const updatedMovie = {
        ...existingMovie,
        state: 'playing',
        watchedMs: 180000,
        percentComplete: 0.0417,
        startTime: mockDate,
      };

      movieRepository.findByRatingKey.mockResolvedValue(existingMovie as Movie);
      movieRepository.findById.mockResolvedValue(updatedMovie as Movie);

      const scrobblePayload = { ...moviePayload, event: 'media.scrobble' };
      const result = await (service as any).processMovieEvent(
        scrobblePayload,
        'playing',
        null,
      );

      expect(movieRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'playing',
          watchedMs: 180000,
          percentComplete: 0.025,
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedMovie);
    });

    it('should update watchedMs and percentComplete on scrobble', async () => {
      const existingMovie = {
        id: '1',
        ratingKey: '456',
        title: 'Test Movie',
        year: 2025,
        director: 'Test Director',
        studio: 'Test Studio',
        summary: 'Test Summary',
        duration: 7200,
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 120000,
        percentComplete: 0.0278,
      };

      const updatedMovie = {
        ...existingMovie,
        state: 'playing',
        watchedMs: 180000,
        percentComplete: 0.0417,
        startTime: mockDate,
      };

      movieRepository.findByRatingKey.mockResolvedValue(existingMovie as Movie);
      movieRepository.findById.mockResolvedValue(updatedMovie as Movie);

      const scrobblePayload = { ...moviePayload, event: 'media.scrobble' };
      const result = await (service as any).processMovieEvent(
        scrobblePayload,
        'playing',
        null,
      );

      expect(movieRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'playing',
          watchedMs: 180000,
          percentComplete: 180000 / (7200 * 1000),
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedMovie);
    });
  });

  describe('processEpisodeEvent', () => {
    const oneMinuteAgo = new Date(mockDate.getTime() - 60000);
    const episodePayload = {
      event: 'media.play',
      Metadata: {
        type: 'episode',
        ratingKey: '789',
        title: 'Test Episode',
        grandparentTitle: 'Test Show',
        parentIndex: 1,
        index: 1,
        summary: 'Test Summary',
        duration: 1800,
      },
      Account: { title: 'Test User' },
      Player: { title: 'Test Player' },
    };

    it('should create a new episode if it does not exist', async () => {
      const mockEpisode = {
        id: '1',
        ratingKey: '789',
        title: 'Test Episode',
        showTitle: 'Test Show',
        season: 1,
        episode: 1,
        summary: 'Test Summary',
        duration: 1800,
        state: 'playing',
        startTime: mockDate,
      };

      episodeRepository.findByRatingKey.mockResolvedValue(null);
      episodeRepository.create.mockResolvedValue(mockEpisode as Episode);

      const result = await (service as any).processEpisodeEvent(
        episodePayload,
        'playing',
        null,
      );

      expect(episodeRepository.findByRatingKey).toHaveBeenCalledWith('789');
      expect(episodeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingKey: '789',
          title: 'Test Episode',
          showTitle: 'Test Show',
          season: 1,
          episode: 1,
          state: 'playing',
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(mockEpisode);
    });

    it('should update watchedMs and percentComplete on scrobble', async () => {
      const existingEpisode = {
        id: '1',
        ratingKey: '789',
        title: 'Test Episode',
        showTitle: 'Test Show',
        season: 1,
        episode: 1,
        summary: 'Test Summary',
        duration: 1800,
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 120000,
        percentComplete: 0.1111,
      };

      const updatedEpisode = {
        ...existingEpisode,
        state: 'playing',
        watchedMs: 180000,
        percentComplete: 0.1667,
        startTime: mockDate,
      };

      episodeRepository.findByRatingKey.mockResolvedValue(
        existingEpisode as Episode,
      );
      episodeRepository.findById.mockResolvedValue(updatedEpisode as Episode);

      const scrobblePayload = { ...episodePayload, event: 'media.scrobble' };
      const result = await (service as any).processEpisodeEvent(
        scrobblePayload,
        'playing',
        null,
      );

      expect(episodeRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'playing',
          watchedMs: 180000,
          percentComplete: 0.1,
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedEpisode);
    });
  });

  describe('processPlexWebhook', () => {
    it('should handle media.scrobble events for tracks', async () => {
      const scrobblePayload = {
        event: 'media.scrobble',
        Metadata: {
          type: 'track',
          ratingKey: '123',
          title: 'Test Track',
        },
      };

      const processTrackEventSpy = jest
        .spyOn(service as any, 'processTrackEvent')
        .mockResolvedValue({});

      await service.processPlexWebhook(scrobblePayload, null);

      expect(processTrackEventSpy).toHaveBeenCalledWith(
        scrobblePayload,
        'playing',
        null,
      );
    });
  });

  describe('getCurrentMedia', () => {
    beforeEach(() => {
      (service as any).currentMedia = {
        track: { id: '1', title: 'Current Track' },
        movie: { id: '2', title: 'Current Movie' },
        episode: { id: '3', title: 'Current Episode' },
      };
    });

    it('should return currently playing track', () => {
      const result = service.getCurrentMedia('track');
      expect(result).toEqual({ id: '1', title: 'Current Track' });
    });

    it('should return currently playing movie', () => {
      const result = service.getCurrentMedia('movie');
      expect(result).toEqual({ id: '2', title: 'Current Movie' });
    });

    it('should return currently playing episode', () => {
      const result = service.getCurrentMedia('episode');
      expect(result).toEqual({ id: '3', title: 'Current Episode' });
    });

    it('should return null for invalid media type', () => {
      const result = service.getCurrentMedia('invalid');
      expect(result).toBeNull();
    });
  });

  describe('stopOtherPlayingMedia', () => {
    const oneMinuteAgo = new Date(mockDate.getTime() - 60000);

    beforeEach(() => {
      (service as any).currentMedia = {
        track: {
          id: '1',
          title: 'Current Track',
          artist: 'Test Artist',
          state: 'playing',
          startTime: oneMinuteAgo,
          listenedMs: 10000,
        } as Track,
        movie: {
          id: '2',
          title: 'Current Movie',
          state: 'playing',
          startTime: oneMinuteAgo,
          watchedMs: 20000,
          duration: 7200,
        } as Movie,
        episode: {
          id: '3',
          title: 'Current Episode',
          state: 'paused',
          startTime: oneMinuteAgo,
          watchedMs: 30000,
        } as Episode,
      };
    });

    it('should stop all media except the specified type', async () => {
      await (service as any).stopOtherPlayingMedia('episode');

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
          listenedMs: 70000,
        }),
      );

      expect(movieRepository.update).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
          watchedMs: 80000,
          percentComplete: 80000 / (7200 * 1000),
        }),
      );
      expect(episodeRepository.update).not.toHaveBeenCalled();
      expect((service as any).currentMedia.track).toBeNull();
      expect((service as any).currentMedia.movie).toBeNull();
      expect((service as any).currentMedia.episode).toEqual({
        id: '3',
        title: 'Current Episode',
        state: 'paused',
        startTime: oneMinuteAgo,
        watchedMs: 30000,
      });
    });

    it('should not update media that is not playing', async () => {
      (service as any).currentMedia.track.state = 'paused';

      await (service as any).stopOtherPlayingMedia('episode');

      expect(trackRepository.update).not.toHaveBeenCalled();
      expect(movieRepository.update).toHaveBeenCalled();
    });

    it('should handle null current media items', async () => {
      (service as any).currentMedia.track = null;

      await (service as any).stopOtherPlayingMedia('episode');

      expect(trackRepository.update).not.toHaveBeenCalled();
      expect(movieRepository.update).toHaveBeenCalled();
    });
  });
});
