import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaEventService } from './media-event.service';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { Track } from './entities/track.entity';
import { Movie } from './entities/movie.entity';
import { Episode } from './entities/episode.entity';

describe('MediaEventService', () => {
  let service: MediaEventService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTrack1: Partial<Track> = {
    id: '1',
    ratingKey: 'track1',
    title: 'Test Track 1',
    artist: 'Test Artist',
    album: 'Test Album',
    state: 'playing',
    user: 'user1',
    startTime: new Date(),
    listenedMs: 0,
  };

  const mockTrack2: Partial<Track> = {
    id: '2',
    ratingKey: 'track2',
    title: 'Test Track 2',
    artist: 'Test Artist',
    album: 'Test Album',
    state: 'playing',
    user: 'user2',
    startTime: new Date(),
    listenedMs: 0,
  };

  const mockTrack3: Partial<Track> = {
    id: '3',
    ratingKey: 'track3',
    title: 'Test Track 3',
    artist: 'Another Artist',
    album: 'Another Album',
    state: 'playing',
    user: 'user1',
    startTime: new Date(),
    listenedMs: 0,
  };

  const mockMovie1: Partial<Movie> = {
    id: '1',
    ratingKey: 'movie1',
    title: 'Test Movie 1',
    year: 2024,
    director: 'Test Director',
    state: 'playing',
    user: 'user1',
    startTime: new Date(),
    watchedMs: 0,
  };

  const mockMovie2: Partial<Movie> = {
    id: '2',
    ratingKey: 'movie2',
    title: 'Test Movie 2',
    year: 2024,
    director: 'Test Director',
    state: 'playing',
    user: 'user2',
    startTime: new Date(),
    watchedMs: 0,
  };

  const mockEpisode1: Partial<Episode> = {
    id: '1',
    ratingKey: 'episode1',
    title: 'Test Episode 1',
    showTitle: 'Test Show',
    season: 1,
    episode: 1,
    state: 'playing',
    user: 'user1',
    startTime: new Date(),
    watchedMs: 0,
  };

  const mockEpisode2: Partial<Episode> = {
    id: '2',
    ratingKey: 'episode2',
    title: 'Test Episode 2',
    showTitle: 'Test Show',
    season: 1,
    episode: 2,
    state: 'playing',
    user: 'user2',
    startTime: new Date(),
    watchedMs: 0,
  };

  beforeEach(async () => {
    const mockTrackRepo = {
      findByState: jest.fn(),
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
    };

    const mockMovieRepo = {
      findByState: jest.fn(),
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
    };

    const mockEpisodeRepo = {
      findByState: jest.fn(),
      findByRatingKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
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

    trackRepository.findByState.mockResolvedValue([]);
    movieRepository.findByState.mockResolvedValue([]);
    episodeRepository.findByState.mockResolvedValue([]);
    await service.onModuleInit();
  });

  describe('processPlexWebhook', () => {
    it('should process track play event for a user', async () => {
      trackRepository.findByRatingKey.mockResolvedValue(null);
      trackRepository.create.mockResolvedValue(mockTrack1 as Track);
      trackRepository.findById.mockResolvedValue(mockTrack1 as Track);

      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          title: 'Test Track 1',
          ratingKey: 'track1',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
        Account: {
          title: 'user1',
        },
        Player: {
          title: 'Test Player',
        },
      };

      await service.processPlexWebhook(payload, null);

      expect(trackRepository.create).toHaveBeenCalled();
      expect(trackRepository.create.mock.calls[0][0]).toMatchObject({
        ratingKey: 'track1',
        title: 'Test Track 1',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        user: 'user1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          ratingKey: 'track1',
          title: 'Test Track 1',
          artist: 'Test Artist',
          album: 'Test Album',
          state: 'playing',
          user: 'user1',
        }),
      );

      const userMedia = service.getCurrentMedia('track', 'user1');
      expect(userMedia).toHaveLength(1);
      expect(userMedia[0]).toMatchObject({
        id: '1',
        title: 'Test Track 1',
        artist: 'Test Artist',
        album: 'Test Album',
        state: 'playing',
        user: 'user1',
      });
    });

    it('should process movie play event for a user', async () => {
      movieRepository.findByRatingKey.mockResolvedValue(null);
      movieRepository.create.mockResolvedValue(mockMovie1 as Movie);
      movieRepository.findById.mockResolvedValue(mockMovie1 as Movie);

      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'movie',
          title: 'Test Movie 1',
          ratingKey: 'movie1',
          year: 2024,
          Director: { tag: 'Test Director' },
        },
        Account: {
          title: 'user1',
        },
        Player: {
          title: 'Test Player',
        },
      };

      await service.processPlexWebhook(payload, null);

      expect(movieRepository.create).toHaveBeenCalled();
      expect(movieRepository.create.mock.calls[0][0]).toMatchObject({
        ratingKey: 'movie1',
        title: 'Test Movie 1',
        year: 2024,
        director: 'Test Director',
        state: 'playing',
        user: 'user1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.videoEvent',
        expect.objectContaining({
          ratingKey: 'movie1',
          title: 'Test Movie 1',
          year: 2024,
          director: 'Test Director',
          state: 'playing',
          user: 'user1',
        }),
      );

      const userMedia = service.getCurrentMedia('movie', 'user1');
      expect(userMedia).toHaveLength(1);
      expect(userMedia[0]).toMatchObject({
        id: '1',
        title: 'Test Movie 1',
        year: 2024,
        director: 'Test Director',
        state: 'playing',
        user: 'user1',
      });
    });

    it('should process episode play event for a user', async () => {
      episodeRepository.findByRatingKey.mockResolvedValue(null);
      episodeRepository.create.mockResolvedValue(mockEpisode1 as Episode);
      episodeRepository.findById.mockResolvedValue(mockEpisode1 as Episode);

      const payload = {
        event: 'media.play',
        Metadata: {
          type: 'episode',
          title: 'Test Episode 1',
          ratingKey: 'episode1',
          grandparentTitle: 'Test Show',
          parentIndex: 1,
          index: 1,
        },
        Account: {
          title: 'user1',
        },
        Player: {
          title: 'Test Player',
        },
      };

      await service.processPlexWebhook(payload, null);

      expect(episodeRepository.create).toHaveBeenCalled();
      expect(episodeRepository.create.mock.calls[0][0]).toMatchObject({
        ratingKey: 'episode1',
        title: 'Test Episode 1',
        showTitle: 'Test Show',
        season: 1,
        episode: 1,
        state: 'playing',
        user: 'user1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'plex.videoEvent',
        expect.objectContaining({
          ratingKey: 'episode1',
          title: 'Test Episode 1',
          showTitle: 'Test Show',
          season: 1,
          episode: 1,
          state: 'playing',
          user: 'user1',
        }),
      );

      const userMedia = service.getCurrentMedia('episode', 'user1');
      expect(userMedia).toHaveLength(1);
      expect(userMedia[0]).toMatchObject({
        id: '1',
        title: 'Test Episode 1',
        showTitle: 'Test Show',
        season: 1,
        episode: 1,
        state: 'playing',
        user: 'user1',
      });
    });

    it('should stop previous track of the same user when playing a new track', async () => {
      trackRepository.findByRatingKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const existingTrack = {
        ...mockTrack1,
        state: 'playing',
      } as Track;

      trackRepository.create
        .mockResolvedValueOnce(existingTrack)
        .mockResolvedValueOnce(mockTrack3 as Track);

      trackRepository.findById
        .mockResolvedValueOnce(existingTrack)
        .mockResolvedValueOnce({ ...existingTrack, state: 'stopped' } as Track)
        .mockResolvedValueOnce(mockTrack3 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      trackRepository.update.mockClear();

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 3',
            ratingKey: 'track3',
            grandparentTitle: 'Another Artist',
            parentTitle: 'Another Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      expect(trackRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          state: 'stopped',
        }),
      );
    });

    it('should allow different users to have different tracks playing simultaneously', async () => {
      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(mockTrack1 as Track);
      trackRepository.findById.mockResolvedValueOnce(mockTrack1 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(mockTrack2 as Track);
      trackRepository.findById.mockResolvedValueOnce(mockTrack2 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 2',
            ratingKey: 'track2',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user2' },
        },
        null,
      );

      const user1Media = service.getCurrentMedia('track', 'user1');
      expect(user1Media).toHaveLength(1);
      expect(user1Media[0]).toMatchObject({
        id: '1',
        title: 'Test Track 1',
        user: 'user1',
      });

      const user2Media = service.getCurrentMedia('track', 'user2');
      expect(user2Media).toHaveLength(1);
      expect(user2Media[0]).toMatchObject({
        id: '2',
        title: 'Test Track 2',
        user: 'user2',
      });

      const allTracks = service.getCurrentMedia('track');
      expect(allTracks).toHaveLength(2);
      expect(allTracks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', user: 'user1' }),
          expect.objectContaining({ id: '2', user: 'user2' }),
        ]),
      );
    });
  });

  describe('getCurrentMedia', () => {
    it('should return media of specific type for all users', async () => {
      trackRepository.findByRatingKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      trackRepository.create
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);
      trackRepository.findById
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 2',
            ratingKey: 'track2',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user2' },
        },
        null,
      );

      const allTracks = service.getCurrentMedia('track');

      expect(allTracks).toHaveLength(2);
      expect(allTracks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', user: 'user1' }),
          expect.objectContaining({ id: '2', user: 'user2' }),
        ]),
      );
    });

    it('should return media of specific type for a specific user', async () => {
      trackRepository.findByRatingKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      trackRepository.create
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);
      trackRepository.findById
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 2',
            ratingKey: 'track2',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user2' },
        },
        null,
      );

      const user1Tracks = service.getCurrentMedia('track', 'user1');

      expect(user1Tracks).toHaveLength(1);
      expect(user1Tracks[0]).toMatchObject({
        id: '1',
        title: 'Test Track 1',
        user: 'user1',
      });
    });

    it('should return all media types for a specific user', async () => {
      trackRepository.findByRatingKey.mockResolvedValueOnce(null);
      trackRepository.create.mockResolvedValueOnce(mockTrack1 as Track);
      trackRepository.findById.mockResolvedValueOnce(mockTrack1 as Track);

      movieRepository.findByRatingKey.mockResolvedValueOnce(null);
      movieRepository.create.mockResolvedValueOnce(mockMovie1 as Movie);
      movieRepository.findById.mockResolvedValueOnce(mockMovie1 as Movie);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'movie',
            title: 'Test Movie 1',
            ratingKey: 'movie1',
            year: 2024,
            Director: { tag: 'Test Director' },
          },
          Account: { title: 'user1' },
        },
        null,
      );

      const user1Media = service.getCurrentMedia('all', 'user1');

      expect(user1Media).toMatchObject({
        tracks: [expect.objectContaining({ id: '1', title: 'Test Track 1' })],
        movies: [expect.objectContaining({ id: '1', title: 'Test Movie 1' })],
        episodes: [],
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should return list of active users', async () => {
      trackRepository.findByRatingKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      trackRepository.create
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);
      trackRepository.findById
        .mockResolvedValueOnce(mockTrack1 as Track)
        .mockResolvedValueOnce(mockTrack2 as Track);

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 1',
            ratingKey: 'track1',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user1' },
        },
        null,
      );

      await service.processPlexWebhook(
        {
          event: 'media.play',
          Metadata: {
            type: 'track',
            title: 'Test Track 2',
            ratingKey: 'track2',
            grandparentTitle: 'Test Artist',
            parentTitle: 'Test Album',
          },
          Account: { title: 'user2' },
        },
        null,
      );

      const activeUsers = service.getActiveUsers();

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers).toContain('user1');
      expect(activeUsers).toContain('user2');
    });
  });
});
