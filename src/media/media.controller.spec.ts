import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { NotFoundException } from '@nestjs/common';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: jest.Mocked<MediaService>;

  const mockTrack = {
    id: '1',
    ratingKey: 'track123',
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    state: 'playing',
    user: 'TestUser',
  };

  const mockMovie = {
    id: '1',
    ratingKey: 'movie123',
    title: 'Test Movie',
    year: 2025,
    director: 'Test Director',
    studio: 'Test Studio',
    state: 'playing',
    user: 'TestUser',
  };

  const mockEpisode = {
    id: '1',
    ratingKey: 'episode123',
    title: 'Test Episode',
    showTitle: 'Test Show',
    season: 1,
    episode: 1,
    state: 'playing',
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
    topAlbums: [{ name: 'Test Album', count: 5 }],
  };

  const mockActiveUsers = ['TestUser', 'AnotherUser'];

  beforeEach(async () => {
    const mockMediaServiceProvider = {
      getCurrentMedia: jest.fn(),
      getActiveUsers: jest.fn(),
      getMediaById: jest.fn(),
      getRecentTracks: jest.fn(),
      getTracksByArtist: jest.fn(),
      getTracksByAlbum: jest.fn(),
      getTracksByState: jest.fn(),
      getListeningStats: jest.fn(),
      getTopAlbums: jest.fn(),
      getRecentMovies: jest.fn(),
      getMoviesByDirector: jest.fn(),
      getMoviesByStudio: jest.fn(),
      getMoviesByState: jest.fn(),
      getMovieWatchingStats: jest.fn(),
      getTopDirectors: jest.fn(),
      getRecentEpisodes: jest.fn(),
      getEpisodesByShow: jest.fn(),
      getEpisodesBySeason: jest.fn(),
      getEpisodesByState: jest.fn(),
      getTVWatchingStats: jest.fn(),
      getShowsInProgress: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaServiceProvider,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get(MediaService) as jest.Mocked<MediaService>;
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      mediaService.getActiveUsers.mockResolvedValue(mockActiveUsers);

      const result = await controller.getActiveUsers();

      expect(mediaService.getActiveUsers).toHaveBeenCalled();
      expect(result).toEqual({ users: mockActiveUsers });
    });
  });

  describe('getCurrentMedia', () => {
    it('should return current media for specified type', async () => {
      mediaService.getCurrentMedia.mockResolvedValue([mockTrack]);

      const result = await controller.getCurrentMedia('track');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return current media for specified type and user', async () => {
      mediaService.getCurrentMedia.mockResolvedValue([mockTrack]);

      const result = await controller.getCurrentMedia('track', 'TestUser');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        'TestUser',
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return all media types when type is "all"', async () => {
      mediaService.getCurrentMedia.mockResolvedValue(mockCurrentMedia);

      const result = await controller.getCurrentMedia('all');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'all',
        undefined,
      );
      expect(result).toEqual(mockCurrentMedia);
    });
  });

  describe('getTracks', () => {
    it('should get tracks by artist when artist is provided', async () => {
      mediaService.getTracksByArtist.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(10, 'Test Artist');

      expect(mediaService.getTracksByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by artist for a specific user', async () => {
      mediaService.getTracksByArtist.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(
        10,
        'Test Artist',
        undefined,
        undefined,
        'TestUser',
      );

      expect(mediaService.getTracksByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
        'TestUser',
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by album when album is provided', async () => {
      mediaService.getTracksByAlbum.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(10, undefined, 'Test Album');

      expect(mediaService.getTracksByAlbum).toHaveBeenCalledWith(
        'Test Album',
        10,
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by state when state is provided', async () => {
      mediaService.getTracksByState.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(
        10,
        undefined,
        undefined,
        'playing',
      );

      expect(mediaService.getTracksByState).toHaveBeenCalledWith(
        'playing',
        10,
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get recent tracks when no filters are provided', async () => {
      mediaService.getRecentTracks.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(10);

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10, undefined);
      expect(result).toEqual([mockTrack]);
    });

    it('should get recent tracks for a specific user', async () => {
      mediaService.getRecentTracks.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(
        10,
        undefined,
        undefined,
        undefined,
        'TestUser',
      );

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10, 'TestUser');
      expect(result).toEqual([mockTrack]);
    });
  });

  describe('getTrackById', () => {
    it('should return track when found', async () => {
      mediaService.getMediaById.mockResolvedValue(mockTrack);

      const result = await controller.getTrackById('1');

      expect(mediaService.getMediaById).toHaveBeenCalledWith('track', '1');
      expect(result).toEqual(mockTrack);
    });

    it('should throw NotFoundException when track not found', async () => {
      mediaService.getMediaById.mockResolvedValue(null);

      await expect(controller.getTrackById('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mediaService.getMediaById).toHaveBeenCalledWith('track', '999');
    });
  });

  describe('getMusicStats', () => {
    it('should return listening stats for specified timeframe', async () => {
      mediaService.getListeningStats.mockResolvedValue(mockStats);

      const result = await controller.getMusicStats('week');

      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'week',
        undefined,
      );
      expect(result).toEqual(mockStats);
    });

    it('should return listening stats for specified timeframe and user', async () => {
      mediaService.getListeningStats.mockResolvedValue({
        user: 'TestUser',
        ...mockStats,
      });

      const result = await controller.getMusicStats('week', 'TestUser');

      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'week',
        'TestUser',
      );
      expect(result).toEqual({
        user: 'TestUser',
        ...mockStats,
      });
    });

    it('should use "all" as default timeframe', async () => {
      mediaService.getListeningStats.mockResolvedValue(mockStats);

      const result = await controller.getMusicStats();

      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'all',
        undefined,
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('getMovies', () => {
    it('should get movies by director when director is provided', async () => {
      mediaService.getMoviesByDirector.mockResolvedValue([mockMovie]);

      const result = await controller.getMovies(10, 'Test Director');

      expect(mediaService.getMoviesByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
        undefined,
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by director for a specific user', async () => {
      mediaService.getMoviesByDirector.mockResolvedValue([mockMovie]);

      const result = await controller.getMovies(
        10,
        'Test Director',
        undefined,
        undefined,
        'TestUser',
      );

      expect(mediaService.getMoviesByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
        'TestUser',
      );
      expect(result).toEqual([mockMovie]);
    });
  });

  describe('getAllStats', () => {
    it('should return combined stats for all media types', async () => {
      const combinedStats = {
        music: { totalListeningTimeMs: 3600000 },
        movies: { totalWatchTimeMs: 7200000 },
        tv: { totalWatchTimeMs: 10800000 },
      };

      mediaService.getStats.mockResolvedValue(combinedStats);

      const result = await controller.getAllStats('week');

      expect(mediaService.getStats).toHaveBeenCalledWith('week', undefined);
      expect(result).toEqual(combinedStats);
    });

    it('should return combined stats for a specific user', async () => {
      const combinedStats = {
        user: 'TestUser',
        music: { totalListeningTimeMs: 3600000 },
        movies: { totalWatchTimeMs: 7200000 },
        tv: { totalWatchTimeMs: 10800000 },
      };

      mediaService.getStats.mockResolvedValue(combinedStats);

      const result = await controller.getAllStats('week', 'TestUser');

      expect(mediaService.getStats).toHaveBeenCalledWith('week', 'TestUser');
      expect(result).toEqual(combinedStats);
    });
  });
});
