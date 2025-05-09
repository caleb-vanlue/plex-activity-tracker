import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { MediaEventService } from './media-event.service';
import { Episode } from './entities/episode.entity';
import { Movie } from './entities/movie.entity';
import { Track } from './entities/track.entity';

describe('MediaService', () => {
  let service: MediaService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;
  let mediaEventService: jest.Mocked<MediaEventService>;

  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    user: 'TestUser',
  };

  const mockMovie = {
    id: '1',
    title: 'Test Movie',
    year: 2025,
    director: 'Test Director',
    user: 'TestUser',
  };

  const mockEpisode = {
    id: '1',
    title: 'Test Episode',
    showTitle: 'Test Show',
    season: 1,
    episode: 1,
    user: 'TestUser',
  };

  const mockCurrentMedia = {
    tracks: [mockTrack],
    movies: [],
    episodes: [],
  };

  const mockStats = {
    totalListeningTimeMs: 3600000,
    topArtists: [{ name: 'Test Artist', count: 10 }],
  };

  beforeEach(async () => {
    const mockTrackRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByArtist: jest.fn(),
      findByAlbum: jest.fn(),
      findByState: jest.fn(),
      findByUser: jest.fn(),
      findByArtistAndUser: jest.fn(),
      findByAlbumAndUser: jest.fn(),
      findByStateAndUser: jest.fn(),
      getListeningStats: jest.fn(),
      getUserListeningStats: jest.fn(),
      getTopAlbums: jest.fn(),
      getUserTopAlbums: jest.fn(),
    };

    const mockMovieRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByDirector: jest.fn(),
      findByStudio: jest.fn(),
      findByState: jest.fn(),
      findByUser: jest.fn(),
      findByDirectorAndUser: jest.fn(),
      findByStudioAndUser: jest.fn(),
      findByStateAndUser: jest.fn(),
      getWatchingStats: jest.fn(),
      getUserWatchingStats: jest.fn(),
      getTopDirectors: jest.fn(),
      getUserTopDirectors: jest.fn(),
    };

    const mockEpisodeRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByShow: jest.fn(),
      findBySeason: jest.fn(),
      findByState: jest.fn(),
      findByUser: jest.fn(),
      findByShowAndUser: jest.fn(),
      findBySeasonAndUser: jest.fn(),
      findByStateAndUser: jest.fn(),
      getWatchingStats: jest.fn(),
      getUserWatchingStats: jest.fn(),
      getShowsInProgress: jest.fn(),
      getUserShowsInProgress: jest.fn(),
    };

    const mockMediaEventService = {
      getCurrentMedia: jest.fn(),
      getActiveUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
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
          provide: MediaEventService,
          useValue: mockMediaEventService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    trackRepository = module.get(
      TrackRepository,
    ) as jest.Mocked<TrackRepository>;
    movieRepository = module.get(
      MovieRepository,
    ) as jest.Mocked<MovieRepository>;
    episodeRepository = module.get(
      EpisodeRepository,
    ) as jest.Mocked<EpisodeRepository>;
    mediaEventService = module.get(
      MediaEventService,
    ) as jest.Mocked<MediaEventService>;
  });

  describe('getCurrentMedia', () => {
    it('should return media for a specific type', async () => {
      mediaEventService.getCurrentMedia.mockReturnValue([mockTrack]);

      const result = await service.getCurrentMedia('track');

      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return media for a specific type and user', async () => {
      mediaEventService.getCurrentMedia.mockReturnValue([mockTrack]);

      const result = await service.getCurrentMedia('track', 'TestUser');

      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        'TestUser',
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return all media types when type is "all"', async () => {
      mediaEventService.getCurrentMedia.mockReturnValue({
        tracks: [mockTrack],
        movies: [],
        episodes: [],
      });

      const result = await service.getCurrentMedia('all');

      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith(
        'all',
        undefined,
      );
      expect(result).toEqual({
        tracks: [mockTrack],
        movies: [],
        episodes: [],
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      mediaEventService.getActiveUsers.mockReturnValue([
        'TestUser',
        'AnotherUser',
      ]);

      const result = await service.getActiveUsers();

      expect(mediaEventService.getActiveUsers).toHaveBeenCalled();
      expect(result).toEqual(['TestUser', 'AnotherUser']);
    });
  });

  describe('getMediaById', () => {
    it('should find track by id', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack as Track);

      const result = await service.getMediaById('track', '1');

      expect(trackRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTrack);
    });

    it('should find movie by id', async () => {
      movieRepository.findById.mockResolvedValue(mockMovie as Movie);

      const result = await service.getMediaById('movie', '1');

      expect(movieRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMovie);
    });

    it('should find episode by id', async () => {
      episodeRepository.findById.mockResolvedValue(mockEpisode as Episode);

      const result = await service.getMediaById('episode', '1');

      expect(episodeRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEpisode);
    });

    it('should return null for invalid media type', async () => {
      const result = await service.getMediaById('invalid', '1');

      expect(result).toBeNull();
    });
  });

  describe('track-related methods', () => {
    it('should get recent tracks', async () => {
      trackRepository.findRecent.mockResolvedValue([mockTrack as Track]);

      const result = await service.getRecentTracks(10);

      expect(trackRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get recent tracks for a specific user', async () => {
      trackRepository.findByUser.mockResolvedValue([mockTrack as Track]);

      const result = await service.getRecentTracks(10, 'TestUser');

      expect(trackRepository.findByUser).toHaveBeenCalledWith('TestUser', 10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by artist', async () => {
      trackRepository.findByArtist.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByArtist('Test Artist', 10);

      expect(trackRepository.findByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by artist for a specific user', async () => {
      trackRepository.findByArtistAndUser.mockResolvedValue([
        mockTrack as Track,
      ]);

      const result = await service.getTracksByArtist(
        'Test Artist',
        10,
        'TestUser',
      );

      expect(trackRepository.findByArtistAndUser).toHaveBeenCalledWith(
        'Test Artist',
        'TestUser',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by album', async () => {
      trackRepository.findByAlbum.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByAlbum('Test Album', 10);

      expect(trackRepository.findByAlbum).toHaveBeenCalledWith(
        'Test Album',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by album for a specific user', async () => {
      trackRepository.findByAlbumAndUser.mockResolvedValue([
        mockTrack as Track,
      ]);

      const result = await service.getTracksByAlbum(
        'Test Album',
        10,
        'TestUser',
      );

      expect(trackRepository.findByAlbumAndUser).toHaveBeenCalledWith(
        'Test Album',
        'TestUser',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by state', async () => {
      trackRepository.findByState.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByState('playing', 10);

      expect(trackRepository.findByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by state for a specific user', async () => {
      trackRepository.findByStateAndUser.mockResolvedValue([
        mockTrack as Track,
      ]);

      const result = await service.getTracksByState('playing', 10, 'TestUser');

      expect(trackRepository.findByStateAndUser).toHaveBeenCalledWith(
        'playing',
        'TestUser',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get listening stats', async () => {
      trackRepository.getListeningStats.mockResolvedValue(mockStats);

      const result = await service.getListeningStats('week');

      expect(trackRepository.getListeningStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(mockStats);
    });

    it('should get listening stats for a specific user', async () => {
      trackRepository.getUserListeningStats.mockResolvedValue({
        user: 'TestUser',
        ...mockStats,
      });

      const result = await service.getListeningStats('week', 'TestUser');

      expect(trackRepository.getUserListeningStats).toHaveBeenCalledWith(
        'TestUser',
        'week',
      );
      expect(result).toEqual({
        user: 'TestUser',
        ...mockStats,
      });
    });
  });

  describe('movie-related methods', () => {
    it('should get recent movies', async () => {
      movieRepository.findRecent.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getRecentMovies(10);

      expect(movieRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get recent movies for a specific user', async () => {
      movieRepository.findByUser.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getRecentMovies(10, 'TestUser');

      expect(movieRepository.findByUser).toHaveBeenCalledWith('TestUser', 10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by director', async () => {
      movieRepository.findByDirector.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getMoviesByDirector('Test Director', 10);

      expect(movieRepository.findByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by director for a specific user', async () => {
      movieRepository.findByDirectorAndUser.mockResolvedValue([
        mockMovie as Movie,
      ]);

      const result = await service.getMoviesByDirector(
        'Test Director',
        10,
        'TestUser',
      );

      expect(movieRepository.findByDirectorAndUser).toHaveBeenCalledWith(
        'Test Director',
        'TestUser',
        10,
      );
      expect(result).toEqual([mockMovie]);
    });
  });

  describe('episode-related methods', () => {
    it('should get recent episodes', async () => {
      episodeRepository.findRecent.mockResolvedValue([mockEpisode as Episode]);

      const result = await service.getRecentEpisodes(10);

      expect(episodeRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockEpisode]);
    });

    it('should get recent episodes for a specific user', async () => {
      episodeRepository.findByUser.mockResolvedValue([mockEpisode as Episode]);

      const result = await service.getRecentEpisodes(10, 'TestUser');

      expect(episodeRepository.findByUser).toHaveBeenCalledWith('TestUser', 10);
      expect(result).toEqual([mockEpisode]);
    });
  });

  describe('getStats', () => {
    it('should get combined stats for all media types', async () => {
      const musicStats = { totalListeningTimeMs: 3600000 };
      const movieStats = { totalWatchTimeMs: 7200000 };
      const tvStats = { totalWatchTimeMs: 10800000 };

      trackRepository.getListeningStats.mockResolvedValue(musicStats);
      movieRepository.getWatchingStats.mockResolvedValue(movieStats);
      episodeRepository.getWatchingStats.mockResolvedValue(tvStats);

      const result = await service.getStats('week');

      expect(trackRepository.getListeningStats).toHaveBeenCalledWith('week');
      expect(movieRepository.getWatchingStats).toHaveBeenCalledWith('week');
      expect(episodeRepository.getWatchingStats).toHaveBeenCalledWith('week');

      expect(result).toEqual({
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      });
    });

    it('should get combined stats for a specific user', async () => {
      const musicStats = { totalListeningTimeMs: 3600000 };
      const movieStats = { totalWatchTimeMs: 7200000 };
      const tvStats = { totalWatchTimeMs: 10800000 };

      trackRepository.getUserListeningStats.mockResolvedValue(musicStats);
      movieRepository.getUserWatchingStats.mockResolvedValue(movieStats);
      episodeRepository.getUserWatchingStats.mockResolvedValue(tvStats);

      const result = await service.getStats('week', 'TestUser');

      expect(trackRepository.getUserListeningStats).toHaveBeenCalledWith(
        'TestUser',
        'week',
      );
      expect(movieRepository.getUserWatchingStats).toHaveBeenCalledWith(
        'TestUser',
        'week',
      );
      expect(episodeRepository.getUserWatchingStats).toHaveBeenCalledWith(
        'TestUser',
        'week',
      );

      expect(result).toEqual({
        user: 'TestUser',
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      });
    });
  });
});
