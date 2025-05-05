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
  };

  const mockMovie = {
    id: '1',
    ratingKey: 'movie123',
    title: 'Test Movie',
    year: 2025,
    director: 'Test Director',
    studio: 'Test Studio',
    state: 'playing',
  };

  const mockEpisode = {
    id: '1',
    ratingKey: 'episode123',
    title: 'Test Episode',
    showTitle: 'Test Show',
    season: 1,
    episode: 1,
    state: 'playing',
  };

  const mockCurrentMedia = {
    track: mockTrack,
    movie: null,
    episode: null,
  };

  const mockStats = {
    totalListeningTimeMs: 3600000,
    topArtists: [{ name: 'Test Artist', count: 10 }],
    topAlbums: [{ name: 'Test Album', count: 5 }],
  };

  beforeEach(async () => {
    const mockMediaServiceProvider = {
      getCurrentMedia: jest.fn(),
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

  describe('getCurrentMedia', () => {
    it('should return current media for specified type', async () => {
      mediaService.getCurrentMedia.mockResolvedValue(mockTrack);

      const result = await controller.getCurrentMedia('track');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith('track');
      expect(result).toEqual(mockTrack);
    });

    it('should return all media types when type is "all"', async () => {
      mediaService.getCurrentMedia.mockResolvedValue(mockCurrentMedia);

      const result = await controller.getCurrentMedia('all');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith('all');
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
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by album when album is provided', async () => {
      mediaService.getTracksByAlbum.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(10, undefined, 'Test Album');

      expect(mediaService.getTracksByAlbum).toHaveBeenCalledWith(
        'Test Album',
        10,
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

      expect(mediaService.getTracksByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get recent tracks when no filters are provided', async () => {
      mediaService.getRecentTracks.mockResolvedValue([mockTrack]);

      const result = await controller.getTracks(10);

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10);
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

      expect(mediaService.getListeningStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(mockStats);
    });

    it('should use "all" as default timeframe', async () => {
      mediaService.getListeningStats.mockResolvedValue(mockStats);

      const result = await controller.getMusicStats();

      expect(mediaService.getListeningStats).toHaveBeenCalledWith('all');
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
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by studio when studio is provided', async () => {
      mediaService.getMoviesByStudio.mockResolvedValue([mockMovie]);

      const result = await controller.getMovies(10, undefined, 'Test Studio');

      expect(mediaService.getMoviesByStudio).toHaveBeenCalledWith(
        'Test Studio',
        10,
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by state when state is provided', async () => {
      mediaService.getMoviesByState.mockResolvedValue([mockMovie]);

      const result = await controller.getMovies(
        10,
        undefined,
        undefined,
        'playing',
      );

      expect(mediaService.getMoviesByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get recent movies when no filters are provided', async () => {
      mediaService.getRecentMovies.mockResolvedValue([mockMovie]);

      const result = await controller.getMovies(10);

      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockMovie]);
    });
  });

  describe('getMovieById', () => {
    it('should return movie when found', async () => {
      mediaService.getMediaById.mockResolvedValue(mockMovie);

      const result = await controller.getMovieById('1');

      expect(mediaService.getMediaById).toHaveBeenCalledWith('movie', '1');
      expect(result).toEqual(mockMovie);
    });

    it('should throw NotFoundException when movie not found', async () => {
      mediaService.getMediaById.mockResolvedValue(null);

      await expect(controller.getMovieById('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mediaService.getMediaById).toHaveBeenCalledWith('movie', '999');
    });
  });

  describe('getEpisodes', () => {
    it('should get episodes by show and season when both are provided', async () => {
      mediaService.getEpisodesBySeason.mockResolvedValue([mockEpisode]);

      const result = await controller.getEpisodes(10, 'Test Show', 1);

      expect(mediaService.getEpisodesBySeason).toHaveBeenCalledWith(
        'Test Show',
        1,
        10,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get episodes by show when only show is provided', async () => {
      mediaService.getEpisodesByShow.mockResolvedValue([mockEpisode]);

      const result = await controller.getEpisodes(10, 'Test Show');

      expect(mediaService.getEpisodesByShow).toHaveBeenCalledWith(
        'Test Show',
        10,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get episodes by state when state is provided', async () => {
      mediaService.getEpisodesByState.mockResolvedValue([mockEpisode]);

      const result = await controller.getEpisodes(
        10,
        undefined,
        undefined,
        'playing',
      );

      expect(mediaService.getEpisodesByState).toHaveBeenCalledWith(
        'playing',
        10,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get recent episodes when no filters are provided', async () => {
      mediaService.getRecentEpisodes.mockResolvedValue([mockEpisode]);

      const result = await controller.getEpisodes(10);

      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockEpisode]);
    });
  });

  describe('getEpisodeById', () => {
    it('should return episode when found', async () => {
      mediaService.getMediaById.mockResolvedValue(mockEpisode);

      const result = await controller.getEpisodeById('1');

      expect(mediaService.getMediaById).toHaveBeenCalledWith('episode', '1');
      expect(result).toEqual(mockEpisode);
    });

    it('should throw NotFoundException when episode not found', async () => {
      mediaService.getMediaById.mockResolvedValue(null);

      await expect(controller.getEpisodeById('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mediaService.getMediaById).toHaveBeenCalledWith('episode', '999');
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

      expect(mediaService.getStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(combinedStats);
    });
  });
});
