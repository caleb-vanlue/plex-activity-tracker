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
      findByState: jest.fn().mockResolvedValue([]),
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockMovieRepo = {
      findByState: jest.fn().mockResolvedValue([]),
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEpisodeRepo = {
      findByState: jest.fn().mockResolvedValue([]),
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

    await service.onModuleInit();
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
      const currentTrack = {
        id: '1',
        title: 'Current Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: oneMinuteAgo,
        listenedMs: 10000,
        user: 'Test User',
      } as Track;

      const currentMovie = {
        id: '2',
        title: 'Current Movie',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 20000,
        duration: 7200,
        user: 'Other User',
      } as Movie;

      const currentEpisode = {
        id: '3',
        title: 'Current Episode',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 30000,
        user: 'Third User',
      } as Episode;

      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(currentTrack);
      trackRepository.findById.mockResolvedValueOnce(currentTrack);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            ratingKey: '123',
            title: 'Current Track',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'Test User' },
        },
        null,
      );

      movieRepository.findByRatingKey.mockResolvedValueOnce(null);
      movieRepository.create.mockResolvedValueOnce(currentMovie);
      movieRepository.findById.mockResolvedValueOnce(currentMovie);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'movie',
            ratingKey: '789',
            title: 'Current Movie',
          },
          Account: { title: 'Other User' },
        },
        null,
      );

      episodeRepository.findByRatingKey.mockResolvedValueOnce(null);
      episodeRepository.create.mockResolvedValueOnce(currentEpisode);
      episodeRepository.findById.mockResolvedValueOnce(currentEpisode);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'episode',
            ratingKey: '101112',
            title: 'Current Episode',
          },
          Account: { title: 'Third User' },
        },
        null,
      );

      const newTrack = {
        id: '4',
        ratingKey: '456',
        title: 'New Track',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        startTime: mockDate,
        user: 'Test User',
      } as Track;

      trackRepository.findByRatingKey.mockReset();
      trackRepository.findById.mockReset();
      trackRepository.create.mockReset();
      trackRepository.update.mockReset();

      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(newTrack);
      trackRepository.findById.mockResolvedValueOnce(newTrack);

      trackRepository.findById.mockResolvedValueOnce({
        ...currentTrack,
        state: 'stopped',
        endTime: mockDate,
        listenedMs: 70000, // 10000 + 60000 (1 minute)
      });

      await service.processPlexWebhook(newTrackPayload, null);

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
        }),
      );

      expect(movieRepository.update).not.toHaveBeenCalled();
      expect(episodeRepository.update).not.toHaveBeenCalled();

      const testUserMedia = service.getCurrentMedia('all', 'Test User');
      expect(testUserMedia.tracks[0].id).toBe('4');

      const otherUserMedia = service.getCurrentMedia('all', 'Other User');
      expect(otherUserMedia.movies[0].id).toBe('2');

      const thirdUserMedia = service.getCurrentMedia('all', 'Third User');
      expect(thirdUserMedia.episodes[0].id).toBe('3');
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
      Account: { title: 'Movie User' },
      Player: { title: 'Test Player' },
    };

    it('should stop the previous movie but not affect track or episode', async () => {
      const currentMovie = {
        id: '2',
        title: 'Current Movie',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 20000,
        duration: 7200,
        user: 'Movie User',
      } as Movie;

      const currentTrack = {
        id: '1',
        title: 'Current Track',
        artist: 'Test Artist',
        state: 'playing',
        startTime: oneMinuteAgo,
        listenedMs: 10000,
        user: 'Track User',
      } as Track;

      const currentEpisode = {
        id: '3',
        title: 'Current Episode',
        state: 'playing',
        startTime: oneMinuteAgo,
        watchedMs: 30000,
        user: 'Episode User',
      } as Episode;

      movieRepository.findByRatingKey.mockResolvedValueOnce(null);
      movieRepository.create.mockResolvedValueOnce(currentMovie);
      movieRepository.findById.mockResolvedValueOnce(currentMovie);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'movie',
            ratingKey: '123',
            title: 'Current Movie',
          },
          Account: { title: 'Movie User' },
        },
        null,
      );

      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(currentTrack);
      trackRepository.findById.mockResolvedValueOnce(currentTrack);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            ratingKey: '789',
            title: 'Current Track',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'Track User' },
        },
        null,
      );

      episodeRepository.findByRatingKey.mockResolvedValueOnce(null);
      episodeRepository.create.mockResolvedValueOnce(currentEpisode);
      episodeRepository.findById.mockResolvedValueOnce(currentEpisode);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'episode',
            ratingKey: '101112',
            title: 'Current Episode',
          },
          Account: { title: 'Episode User' },
        },
        null,
      );

      const newMovie = {
        id: '4',
        ratingKey: '456',
        title: 'New Movie',
        year: 2025,
        director: 'Test Director',
        state: 'playing',
        startTime: mockDate,
        duration: 7200,
        user: 'Movie User',
      } as Movie;

      movieRepository.findByRatingKey.mockReset();
      movieRepository.findById.mockReset();
      movieRepository.create.mockReset();
      movieRepository.update.mockReset();

      movieRepository.findByRatingKey.mockResolvedValueOnce(null);
      movieRepository.create.mockResolvedValueOnce(newMovie);
      movieRepository.findById.mockResolvedValueOnce(newMovie);

      movieRepository.findById.mockResolvedValueOnce({
        ...currentMovie,
        state: 'stopped',
        endTime: mockDate,
        watchedMs: 80000, // 20000 + 60000 (1 minute)
      });

      await service.processPlexWebhook(newMoviePayload, null);

      expect(movieRepository.update).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          state: 'stopped',
          endTime: mockDate,
        }),
      );

      expect(trackRepository.update).not.toHaveBeenCalled();
      expect(episodeRepository.update).not.toHaveBeenCalled();

      const movieUserMedia = service.getCurrentMedia('all', 'Movie User');
      expect(movieUserMedia.movies[0].id).toBe('4');

      const trackUserMedia = service.getCurrentMedia('all', 'Track User');
      expect(trackUserMedia.tracks[0].id).toBe('1');

      const episodeUserMedia = service.getCurrentMedia('all', 'Episode User');
      expect(episodeUserMedia.episodes[0].id).toBe('3');
    });
  });
});
