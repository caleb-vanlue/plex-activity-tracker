jest.mock(
  'src/common/repositories/base-stats.repository',
  () => {
    class MockBaseStatsRepository {
      protected getTimeframeCondition() {
        return '';
      }
      protected getUserCondition() {
        return '';
      }
      async getMediaSessionById() {
        return null;
      }
      async findRecentSessions() {
        return [];
      }
      async query() {
        return [];
      }
    }

    return {
      BaseStatsRepository: MockBaseStatsRepository,
    };
  },
  { virtual: true },
);

jest.mock('./media.service');

import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MockProxy, mockDeep } from 'jest-mock-extended';

const mockTrack = { id: '1', title: 'Test Track', artist: 'Test Artist' };
const mockMovie = { id: '1', title: 'Test Movie', director: 'Test Director' };
const mockEpisode = {
  id: '1',
  title: 'Test Episode',
  show: 'Test Show',
  season: 1,
};
const mockActiveUsers = ['user1', 'user2'];
const mockStats = { totalTime: 1000, count: 10 };
const mockTopArtists = [{ artist: 'Test Artist', count: 5 }];
const mockTopAlbums = [{ album: 'Test Album', count: 3 }];
const mockTopDirectors = [{ director: 'Test Director', count: 2 }];
const mockShows = [
  { show: 'Test Show', episodesWatched: 5, totalEpisodes: 10 },
];

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: MockProxy<MediaService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mediaService = mockDeep<MediaService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentMedia', () => {
    it('should get currently playing media', async () => {
      const expected = {
        tracks: [mockTrack],
        movies: [mockMovie],
        episodes: [mockEpisode],
      };

      mediaService.getCurrentMedia.mockResolvedValue(expected);

      expect(await controller.getCurrentMedia({ type: 'all' })).toBe(expected);
      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'all',
        undefined,
      );
    });

    it('should filter by media type', async () => {
      const expected = { tracks: [mockTrack] };

      mediaService.getCurrentMedia.mockResolvedValue(expected);

      expect(
        await controller.getCurrentMedia({ type: 'track', user: 'user1' }),
      ).toBe(expected);
      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        'user1',
      );
    });
  });

  describe('getActiveUsers', () => {
    it('should get active users', async () => {
      mediaService.getActiveUsers.mockResolvedValue(mockActiveUsers);

      expect(await controller.getActiveUsers()).toEqual({
        users: mockActiveUsers,
      });
      expect(mediaService.getActiveUsers).toHaveBeenCalled();
    });
  });

  describe('getTracks', () => {
    it('should get tracks by artist', async () => {
      mediaService.getTracksByArtist.mockResolvedValue([mockTrack]);

      expect(
        await controller.getTracks({ artist: 'Test Artist', limit: 10 }),
      ).toEqual([mockTrack]);
      expect(mediaService.getTracksByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
        undefined,
      );
    });

    it('should get tracks by album', async () => {
      mediaService.getTracksByAlbum.mockResolvedValue([mockTrack]);

      expect(
        await controller.getTracks({ album: 'Test Album', limit: 5 }),
      ).toEqual([mockTrack]);
      expect(mediaService.getTracksByAlbum).toHaveBeenCalledWith(
        'Test Album',
        5,
        undefined,
      );
    });

    it('should get tracks by state', async () => {
      mediaService.getTracksByState.mockResolvedValue([mockTrack]);

      expect(
        await controller.getTracks({
          state: 'playing',
          limit: 5,
          user: 'user1',
        }),
      ).toEqual([mockTrack]);
      expect(mediaService.getTracksByState).toHaveBeenCalledWith(
        'playing',
        5,
        'user1',
      );
    });

    it('should get recent tracks by default', async () => {
      mediaService.getRecentTracks.mockResolvedValue([mockTrack]);

      expect(await controller.getTracks({ limit: 20 })).toEqual([mockTrack]);
      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(20, undefined);
    });
  });

  describe('getTrackById', () => {
    it('should get track by id', async () => {
      mediaService.getMediaById.mockResolvedValue(mockTrack);

      expect(await controller.getTrackById('1')).toBe(mockTrack);
      expect(mediaService.getMediaById).toHaveBeenCalledWith('track', '1');
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
    it('should get music statistics', async () => {
      mediaService.getListeningStats.mockResolvedValue(mockStats);

      expect(
        await controller.getMusicStats({ timeframe: 'week', user: 'user1' }),
      ).toBe(mockStats);
      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'week',
        'user1',
      );
    });

    it('should use default timeframe if not provided', async () => {
      mediaService.getListeningStats.mockResolvedValue(mockStats);

      expect(await controller.getMusicStats({ user: 'user1' })).toBe(mockStats);
      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'all',
        'user1',
      );
    });
  });

  describe('getTopArtists', () => {
    it('should get top artists', async () => {
      mediaService.getTopArtists.mockResolvedValue(mockTopArtists);

      expect(await controller.getTopArtists({ timeframe: 'month' })).toBe(
        mockTopArtists,
      );
      expect(mediaService.getTopArtists).toHaveBeenCalledWith(
        'month',
        undefined,
      );
    });
  });

  describe('getTopAlbums', () => {
    it('should get top albums', async () => {
      mediaService.getTopAlbums.mockResolvedValue(mockTopAlbums);

      expect(await controller.getTopAlbums({ timeframe: 'all' })).toBe(
        mockTopAlbums,
      );
      expect(mediaService.getTopAlbums).toHaveBeenCalledWith('all', undefined);
    });
  });

  describe('getMovies', () => {
    it('should get movies by director', async () => {
      mediaService.getMoviesByDirector.mockResolvedValue([mockMovie]);

      expect(
        await controller.getMovies({ director: 'Test Director', limit: 10 }),
      ).toEqual([mockMovie]);
      expect(mediaService.getMoviesByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
        undefined,
      );
    });

    it('should get movies by studio', async () => {
      mediaService.getMoviesByStudio.mockResolvedValue([mockMovie]);

      expect(
        await controller.getMovies({ studio: 'Test Studio', limit: 5 }),
      ).toEqual([mockMovie]);
      expect(mediaService.getMoviesByStudio).toHaveBeenCalledWith(
        'Test Studio',
        5,
        undefined,
      );
    });

    it('should get movies by state', async () => {
      mediaService.getMoviesByState.mockResolvedValue([mockMovie]);

      expect(
        await controller.getMovies({
          state: 'watched',
          limit: 5,
          user: 'user1',
        }),
      ).toEqual([mockMovie]);
      expect(mediaService.getMoviesByState).toHaveBeenCalledWith(
        'watched',
        5,
        'user1',
      );
    });

    it('should get recent movies by default', async () => {
      mediaService.getRecentMovies.mockResolvedValue([mockMovie]);

      expect(await controller.getMovies({ limit: 20 })).toEqual([mockMovie]);
      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(20, undefined);
    });
  });

  describe('getMovieById', () => {
    it('should get movie by id', async () => {
      mediaService.getMediaById.mockResolvedValue(mockMovie);

      expect(await controller.getMovieById('1')).toBe(mockMovie);
      expect(mediaService.getMediaById).toHaveBeenCalledWith('movie', '1');
    });

    it('should throw NotFoundException when movie not found', async () => {
      mediaService.getMediaById.mockResolvedValue(null);

      await expect(controller.getMovieById('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mediaService.getMediaById).toHaveBeenCalledWith('movie', '999');
    });
  });

  describe('getMovieStats', () => {
    it('should get movie statistics', async () => {
      mediaService.getMovieWatchingStats.mockResolvedValue(mockStats);

      expect(await controller.getMovieStats({ timeframe: 'month' })).toBe(
        mockStats,
      );
      expect(mediaService.getMovieWatchingStats).toHaveBeenCalledWith(
        'month',
        undefined,
      );
    });
  });

  describe('getTopDirectors', () => {
    it('should get top directors', async () => {
      mediaService.getTopDirectors.mockResolvedValue(mockTopDirectors);

      expect(
        await controller.getTopDirectors({ timeframe: 'all', user: 'user1' }),
      ).toBe(mockTopDirectors);
      expect(mediaService.getTopDirectors).toHaveBeenCalledWith('all', 'user1');
    });
  });

  describe('getEpisodes', () => {
    it('should get episodes by show and season', async () => {
      mediaService.getEpisodesBySeason.mockResolvedValue([mockEpisode]);

      expect(
        await controller.getEpisodes({
          show: 'Test Show',
          season: 1,
          limit: 10,
        }),
      ).toEqual([mockEpisode]);
      expect(mediaService.getEpisodesBySeason).toHaveBeenCalledWith(
        'Test Show',
        1,
        10,
        undefined,
      );
    });

    it('should get episodes by show', async () => {
      mediaService.getEpisodesByShow.mockResolvedValue([mockEpisode]);

      expect(
        await controller.getEpisodes({ show: 'Test Show', limit: 5 }),
      ).toEqual([mockEpisode]);
      expect(mediaService.getEpisodesByShow).toHaveBeenCalledWith(
        'Test Show',
        5,
        undefined,
      );
    });

    it('should get episodes by state', async () => {
      mediaService.getEpisodesByState.mockResolvedValue([mockEpisode]);

      expect(
        await controller.getEpisodes({
          state: 'watched',
          limit: 5,
          user: 'user1',
        }),
      ).toEqual([mockEpisode]);
      expect(mediaService.getEpisodesByState).toHaveBeenCalledWith(
        'watched',
        5,
        'user1',
      );
    });

    it('should get recent episodes by default', async () => {
      mediaService.getRecentEpisodes.mockResolvedValue([mockEpisode]);

      expect(await controller.getEpisodes({ limit: 20 })).toEqual([
        mockEpisode,
      ]);
      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(
        20,
        undefined,
      );
    });
  });

  describe('getEpisodeById', () => {
    it('should get episode by id', async () => {
      mediaService.getMediaById.mockResolvedValue(mockEpisode);

      expect(await controller.getEpisodeById('1')).toBe(mockEpisode);
      expect(mediaService.getMediaById).toHaveBeenCalledWith('episode', '1');
    });

    it('should throw NotFoundException when episode not found', async () => {
      mediaService.getMediaById.mockResolvedValue(null);

      await expect(controller.getEpisodeById('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mediaService.getMediaById).toHaveBeenCalledWith('episode', '999');
    });
  });

  describe('getTVStats', () => {
    it('should get TV statistics', async () => {
      mediaService.getTVWatchingStats.mockResolvedValue(mockStats);

      expect(await controller.getTVStats({ timeframe: 'all' })).toBe(mockStats);
      expect(mediaService.getTVWatchingStats).toHaveBeenCalledWith(
        'all',
        undefined,
      );
    });
  });

  describe('getShowsInProgress', () => {
    it('should get shows in progress', async () => {
      mediaService.getShowsInProgress.mockResolvedValue(mockShows);

      expect(await controller.getShowsInProgress('user1')).toBe(mockShows);
      expect(mediaService.getShowsInProgress).toHaveBeenCalledWith('user1');
    });

    it('should work without user parameter', async () => {
      mediaService.getShowsInProgress.mockResolvedValue(mockShows);

      expect(await controller.getShowsInProgress()).toBe(mockShows);
      expect(mediaService.getShowsInProgress).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getAllStats', () => {
    it('should get all media statistics', async () => {
      const allStats = {
        music: mockStats,
        movies: mockStats,
        tv: mockStats,
        total: { totalTime: 3000, count: 30 },
      };

      mediaService.getStats.mockResolvedValue(allStats);

      expect(
        await controller.getAllStats({ timeframe: 'week', user: 'user1' }),
      ).toBe(allStats);
      expect(mediaService.getStats).toHaveBeenCalledWith('week', 'user1');
    });

    it('should use default timeframe if not provided', async () => {
      const allStats = {
        music: mockStats,
        movies: mockStats,
        tv: mockStats,
        total: { totalTime: 3000, count: 30 },
      };

      mediaService.getStats.mockResolvedValue(allStats);

      expect(await controller.getAllStats({})).toBe(allStats);
      expect(mediaService.getStats).toHaveBeenCalledWith('all', undefined);
    });
  });
});
