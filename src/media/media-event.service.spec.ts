import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaEventService } from './media-event.service';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Track } from 'src/media/entities/track.entity';
import { Movie } from 'src/media/entities/movie.entity';
import { Episode } from 'src/media/entities/episode.entity';

describe('MediaEventService', () => {
  let service: MediaEventService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;

  const mockDate = new Date('2025-05-05T12:00:00Z');

  beforeEach(async () => {
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const mockTrackRepository = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockMovieRepository = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEpisodeRepository = {
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new MediaEventService(
      mockEventEmitter as any,
      mockTrackRepository as any,
      mockMovieRepository as any,
      mockEpisodeRepository as any,
    );

    (service as any).logger = mockLogger;

    trackRepository = mockTrackRepository as any;
    movieRepository = mockMovieRepository as any;
    episodeRepository = mockEpisodeRepository as any;
    eventEmitter = mockEventEmitter as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('processPlexWebhook', () => {
    it('should handle missing metadata type', async () => {
      const result = await service.processPlexWebhook({}, null);
      expect(result).toBeNull();
    });

    it('should process track event', async () => {
      const processTrackEventSpy = jest
        .spyOn(service as any, 'processTrackEvent')
        .mockResolvedValue({ id: 1, title: 'Test Track' });

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track',
          },
        },
        'thumbnail.jpg',
      );

      expect(processTrackEventSpy).toHaveBeenCalled();
    });

    it('should process movie event', async () => {
      const processMovieEventSpy = jest
        .spyOn(service as any, 'processMovieEvent')
        .mockResolvedValue({ id: 1, title: 'Test Movie' });

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'movie',
            title: 'Test Movie',
          },
        },
        'thumbnail.jpg',
      );

      expect(processMovieEventSpy).toHaveBeenCalled();
    });

    it('should process episode event', async () => {
      const processEpisodeEventSpy = jest
        .spyOn(service as any, 'processEpisodeEvent')
        .mockResolvedValue({ id: 1, title: 'Test Episode' });

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'episode',
            title: 'Test Episode',
          },
        },
        'thumbnail.jpg',
      );

      expect(processEpisodeEventSpy).toHaveBeenCalled();
    });

    it('should ignore unsupported media types', async () => {
      const result = await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'photo',
            title: 'Test Photo',
          },
        },
        null,
      );

      expect(result).toBeNull();
    });
  });

  describe('processTrackEvent', () => {
    const mockTrackPayload = {
      event: 'media.play',
      Metadata: {
        type: 'track',
        ratingKey: '12345',
        title: 'Test Track',
        grandparentTitle: 'Test Artist',
        parentTitle: 'Test Album',
      },
      Account: {
        title: 'Test User',
      },
      Player: {
        title: 'Test Player',
      },
    };

    it('should create a new track if none exists', async () => {
      trackRepository.findByRatingKey.mockResolvedValue(null);

      const mockTrack = {
        id: 1,
        title: 'Test Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: mockDate,
      } as unknown as Track;

      trackRepository.create.mockResolvedValue(mockTrack);
      trackRepository.findById.mockResolvedValue(mockTrack);

      const processTrackEvent = (service as any).processTrackEvent.bind(
        service,
      );
      const result = await processTrackEvent(
        mockTrackPayload,
        'playing',
        'thumbnail.jpg',
      );

      expect(trackRepository.findByRatingKey).toHaveBeenCalledWith('12345');
      expect(trackRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          title: 'Test Track',
          artist: 'Test Artist',
          state: 'playing',
        }),
      );
      expect(result).toEqual(mockTrack);
    });

    it('should update an existing track from playing to paused', async () => {
      const existingTrack = {
        id: 1,
        title: 'Test Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 60000),
        listenedMs: 120000,
      } as unknown as Track;

      trackRepository.findByRatingKey.mockResolvedValue(existingTrack);

      const updatedTrack = {
        ...existingTrack,
        state: 'paused',
        endTime: mockDate,
        listenedMs: 180000,
      };

      trackRepository.findById.mockResolvedValue(updatedTrack);

      const processTrackEvent = (service as any).processTrackEvent.bind(
        service,
      );
      const result = await processTrackEvent(
        { ...mockTrackPayload, event: 'media.pause' },
        'paused',
        'thumbnail.jpg',
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          state: 'paused',
          endTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedTrack);
    });

    it('should update an existing track from paused to playing', async () => {
      const existingTrack = {
        id: 1,
        title: 'Test Track',
        artist: 'Test Artist',
        state: 'paused',
        endTime: new Date(mockDate.getTime() - 60000),
        listenedMs: 180000,
      } as unknown as Track;

      trackRepository.findByRatingKey.mockResolvedValue(existingTrack);

      const updatedTrack = {
        ...existingTrack,
        state: 'playing',
        startTime: mockDate,
      };

      trackRepository.findById.mockResolvedValue(updatedTrack);

      const processTrackEvent = (service as any).processTrackEvent.bind(
        service,
      );
      const result = await processTrackEvent(
        { ...mockTrackPayload, event: 'media.resume' },
        'playing',
        'thumbnail.jpg',
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          state: 'playing',
          startTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedTrack);
    });

    it('should handle stopping playback and calculate total listened time', async () => {
      const existingTrack = {
        id: 1,
        title: 'Test Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 120000),
        listenedMs: 300000,
      } as unknown as Track;

      trackRepository.findByRatingKey.mockResolvedValue(existingTrack);

      const updatedTrack = {
        ...existingTrack,
        state: 'stopped',
        endTime: mockDate,
        listenedMs: 420000,
      };

      trackRepository.findById.mockResolvedValue(updatedTrack);

      const processTrackEvent = (service as any).processTrackEvent.bind(
        service,
      );
      const result = await processTrackEvent(
        { ...mockTrackPayload, event: 'media.stop' },
        'stopped',
        'thumbnail.jpg',
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
        }),
      );

      expect(trackRepository.update.mock.calls[0][1]).toHaveProperty(
        'listenedMs',
      );
      expect(result).toEqual(updatedTrack);
    });
  });

  describe('processMovieEvent', () => {
    const mockMoviePayload = {
      event: 'media.play',
      Metadata: {
        type: 'movie',
        ratingKey: '12345',
        title: 'Test Movie',
        year: 2024,
        duration: 7200,
        summary: 'Test movie summary',
        studio: 'Test Studio',
        Director: { tag: 'Test Director' },
      },
      Account: {
        title: 'Test User',
      },
      Player: {
        title: 'Test Player',
      },
    };

    it('should create a new movie if none exists', async () => {
      movieRepository.findByRatingKey.mockResolvedValue(null);

      const mockMovie = {
        id: 1,
        title: 'Test Movie',
        year: 2024,
        director: 'Test Director',
        state: 'playing',
        startTime: mockDate,
      } as unknown as Movie;

      movieRepository.create.mockResolvedValue(mockMovie);
      movieRepository.findById.mockResolvedValue(mockMovie);

      const processMovieEvent = (service as any).processMovieEvent.bind(
        service,
      );
      const result = await processMovieEvent(
        mockMoviePayload,
        'playing',
        'thumbnail.jpg',
      );

      expect(movieRepository.findByRatingKey).toHaveBeenCalledWith('12345');
      expect(movieRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.videoEvent',
        expect.objectContaining({
          title: 'Test Movie',
          year: 2024,
          state: 'playing',
        }),
      );
      expect(result).toEqual(mockMovie);
    });

    it('should update an existing movie from playing to paused and calculate watched time', async () => {
      const existingMovie = {
        id: 1,
        title: 'Test Movie',
        year: 2024,
        director: 'Test Director',
        duration: 7200,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 600000),
        watchedMs: 1800000,
      } as unknown as Movie;

      movieRepository.findByRatingKey.mockResolvedValue(existingMovie);

      const updatedMovie = {
        ...existingMovie,
        state: 'paused',
        endTime: mockDate,
        watchedMs: 2400000,
        percentComplete: 2400000 / (7200 * 1000),
      };

      movieRepository.findById.mockResolvedValue(updatedMovie);

      const processMovieEvent = (service as any).processMovieEvent.bind(
        service,
      );
      const result = await processMovieEvent(
        { ...mockMoviePayload, event: 'media.pause' },
        'paused',
        'thumbnail.jpg',
      );

      expect(movieRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          state: 'paused',
          endTime: mockDate,
        }),
      );
      expect(result).toEqual(updatedMovie);
    });

    it('should extract director correctly when provided as an array', async () => {
      movieRepository.findByRatingKey.mockResolvedValue(null);

      const moviePayloadWithMultipleDirectors = {
        ...mockMoviePayload,
        Metadata: {
          ...mockMoviePayload.Metadata,
          Director: [{ tag: 'Director 1' }, { tag: 'Director 2' }],
        },
      };

      const mockMovie = {
        id: 1,
        title: 'Test Movie',
        year: 2024,
        director: 'Director 1, Director 2',
        state: 'playing',
        startTime: mockDate,
      } as unknown as Movie;

      movieRepository.create.mockResolvedValue(mockMovie);
      movieRepository.findById.mockResolvedValue(mockMovie);

      const processMovieEvent = (service as any).processMovieEvent.bind(
        service,
      );
      const result = await processMovieEvent(
        moviePayloadWithMultipleDirectors,
        'playing',
        'thumbnail.jpg',
      );

      expect(movieRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          director: 'Director 1, Director 2',
        }),
      );
    });
  });

  describe('processEpisodeEvent', () => {
    const mockEpisodePayload = {
      event: 'media.play',
      Metadata: {
        type: 'episode',
        ratingKey: '12345',
        title: 'Test Episode',
        grandparentTitle: 'Test Show',
        parentIndex: 1,
        index: 5,
        duration: 1800,
        summary: 'Test episode summary',
      },
      Account: {
        title: 'Test User',
      },
      Player: {
        title: 'Test Player',
      },
    };

    it('should create a new episode if none exists', async () => {
      episodeRepository.findByRatingKey.mockResolvedValue(null);

      const mockEpisode = {
        id: 1,
        title: 'Test Episode',
        showTitle: 'Test Show',
        season: 1,
        episode: 5,
        state: 'playing',
        startTime: mockDate,
      } as unknown as Episode;

      episodeRepository.create.mockResolvedValue(mockEpisode);
      episodeRepository.findById.mockResolvedValue(mockEpisode);

      const processEpisodeEvent = (service as any).processEpisodeEvent.bind(
        service,
      );
      const result = await processEpisodeEvent(
        mockEpisodePayload,
        'playing',
        'thumbnail.jpg',
      );

      expect(episodeRepository.findByRatingKey).toHaveBeenCalledWith('12345');
      expect(episodeRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.videoEvent',
        expect.objectContaining({
          title: 'Test Episode',
          showTitle: 'Test Show',
          state: 'playing',
        }),
      );
      expect(result).toEqual(mockEpisode);
    });

    it('should update an existing episode from playing to stopped and calculate watched time', async () => {
      const existingEpisode = {
        id: 1,
        title: 'Test Episode',
        showTitle: 'Test Show',
        season: 1,
        episode: 5,
        duration: 1800,
        state: 'playing',
        startTime: new Date(mockDate.getTime() - 300000),
        watchedMs: 600000,
      } as unknown as Episode;

      episodeRepository.findByRatingKey.mockResolvedValue(existingEpisode);

      const updatedEpisode = {
        ...existingEpisode,
        state: 'stopped',
        endTime: mockDate,
        watchedMs: 900000,
        percentComplete: 900000 / (1800 * 1000),
      };

      episodeRepository.findById.mockResolvedValue(updatedEpisode);

      const processEpisodeEvent = (service as any).processEpisodeEvent.bind(
        service,
      );
      const result = await processEpisodeEvent(
        { ...mockEpisodePayload, event: 'media.stop' },
        'stopped',
        'thumbnail.jpg',
      );

      expect(episodeRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
        }),
      );

      expect(episodeRepository.update.mock.calls[0][1]).toHaveProperty(
        'watchedMs',
      );
      expect(result).toEqual(updatedEpisode);
    });
  });

  describe('getCurrentMedia', () => {
    it('should return the currently playing track', async () => {
      const mockTrack = { id: 1, title: 'Test Track' } as unknown as Track;

      (service as any).currentMedia = {
        track: mockTrack,
        movie: null,
        episode: null,
      };

      expect(service.getCurrentMedia('track')).toEqual(mockTrack);
    });

    it('should return the currently playing movie', async () => {
      const mockMovie = { id: 1, title: 'Test Movie' } as unknown as Movie;

      (service as any).currentMedia = {
        track: null,
        movie: mockMovie,
        episode: null,
      };

      expect(service.getCurrentMedia('movie')).toEqual(mockMovie);
    });

    it('should return the currently playing episode', async () => {
      const mockEpisode = {
        id: 1,
        title: 'Test Episode',
      } as unknown as Episode;

      (service as any).currentMedia = {
        track: null,
        movie: null,
        episode: mockEpisode,
      };

      expect(service.getCurrentMedia('episode')).toEqual(mockEpisode);
    });

    it('should return null for invalid media type', async () => {
      expect(service.getCurrentMedia('invalid')).toBeNull();
    });
  });

  describe('mapEventToState', () => {
    it('should map play events to playing state', () => {
      const mapEventToState = (service as any).mapEventToState.bind(service);
      expect(mapEventToState('media.play')).toBe('playing');
      expect(mapEventToState('media.resume')).toBe('playing');
      expect(mapEventToState('media.scrobble')).toBe('playing');
    });

    it('should map pause event to paused state', () => {
      const mapEventToState = (service as any).mapEventToState.bind(service);
      expect(mapEventToState('media.pause')).toBe('paused');
    });

    it('should map stop event to stopped state', () => {
      const mapEventToState = (service as any).mapEventToState.bind(service);
      expect(mapEventToState('media.stop')).toBe('stopped');
    });

    it('should map unknown events to unknown state', () => {
      const mapEventToState = (service as any).mapEventToState.bind(service);
      expect(mapEventToState('media.unknown')).toBe('unknown');
    });
  });

  describe('extractDirector', () => {
    it('should handle null or undefined metadata', () => {
      const extractDirector = (service as any).extractDirector.bind(service);
      expect(extractDirector(null)).toBeNull();
      expect(extractDirector({})).toBeNull();
    });

    it('should extract director from object', () => {
      const extractDirector = (service as any).extractDirector.bind(service);
      expect(extractDirector({ Director: { tag: 'Test Director' } })).toBe(
        'Test Director',
      );
      expect(extractDirector({ Director: { name: 'Test Director' } })).toBe(
        'Test Director',
      );
    });

    it('should extract directors from array', () => {
      const extractDirector = (service as any).extractDirector.bind(service);
      expect(
        extractDirector({
          Director: [{ tag: 'Director 1' }, { tag: 'Director 2' }],
        }),
      ).toBe('Director 1, Director 2');
    });

    it('should handle primitive director value', () => {
      const extractDirector = (service as any).extractDirector.bind(service);
      expect(extractDirector({ Director: 'Test Director' })).toBe(
        'Test Director',
      );
    });
  });
});
