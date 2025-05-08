import { Test, TestingModule } from '@nestjs/testing';
import { MediaEventService } from './media-event.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Track } from './entities/track.entity';
import { Movie } from './entities/movie.entity';
import { Episode } from './entities/episode.entity';

describe('MediaEventService - Same Type Media Stopping', () => {
  let service: MediaEventService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;

  const mockDate = new Date('2025-05-06T12:00:00Z');
  const oneMinuteAgo = new Date(mockDate.getTime() - 60000);

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when starting a new track', () => {
    const newTrackPayload = {
      event: 'media.play',
      Metadata: {
        type: 'track',
        ratingKey: '456',
        title: 'New Track',
        grandparentTitle: 'Test Artist',
        parentTitle: 'Test Album',
      },
      Account: { title: 'Test User' },
      Player: { title: 'Test Player' },
    };

    it('should stop the previous track but not affect movie or episode', async () => {
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
          state: 'playing',
          startTime: oneMinuteAgo,
          watchedMs: 30000,
        } as Episode,
      };

      const newTrack = {
        id: '4',
        ratingKey: '456',
        title: 'New Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        startTime: mockDate,
      } as Track;

      trackRepository.findByRatingKey.mockResolvedValue(null);
      trackRepository.create.mockResolvedValue(newTrack);

      await (service as any).processTrackEvent(
        newTrackPayload,
        'playing',
        null,
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
          listenedMs: 70000, // 10000 + 60000 (1 minute)
        }),
      );

      expect(movieRepository.update).not.toHaveBeenCalled();
      expect(episodeRepository.update).not.toHaveBeenCalled();
      expect((service as any).currentMedia.track).toBe(newTrack);
      expect((service as any).currentMedia.movie).toEqual({
        id: '2',
        title: 'Current Movie',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 20000,
        duration: 7200,
      });

      expect((service as any).currentMedia.episode).toEqual({
        id: '3',
        title: 'Current Episode',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 30000,
      });
    });
  });

  describe('when starting a new movie', () => {
    const newMoviePayload = {
      event: 'media.play',
      Metadata: {
        type: 'movie',
        ratingKey: '456',
        title: 'New Movie',
        year: 2025,
        Director: [{ tag: 'Test Director' }],
        studio: 'Test Studio',
        summary: 'Test Summary',
        duration: 7200,
      },
      Account: { title: 'Test User' },
      Player: { title: 'Test Player' },
    };

    it('should stop the previous movie but not affect track or episode', async () => {
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
          state: 'playing',
          startTime: oneMinuteAgo,
          watchedMs: 30000,
        } as Episode,
      };

      const newMovie = {
        id: '4',
        ratingKey: '456',
        title: 'New Movie',
        year: 2025,
        director: 'Test Director',
        state: 'playing',
        startTime: mockDate,
        duration: 7200,
      } as Movie;

      movieRepository.findByRatingKey.mockResolvedValue(null);
      movieRepository.create.mockResolvedValue(newMovie);

      await (service as any).processMovieEvent(
        newMoviePayload,
        'playing',
        null,
      );

      expect(movieRepository.update).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
          watchedMs: 80000, // 20000 + 60000 (1 minute)
        }),
      );

      expect(trackRepository.update).not.toHaveBeenCalled();
      expect(episodeRepository.update).not.toHaveBeenCalled();
      expect((service as any).currentMedia.movie).toBe(newMovie);
      expect((service as any).currentMedia.track).toEqual({
        id: '1',
        title: 'Current Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: oneMinuteAgo,
        listenedMs: 10000,
      });

      expect((service as any).currentMedia.episode).toEqual({
        id: '3',
        title: 'Current Episode',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 30000,
      });
    });
  });
});
