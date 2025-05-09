import { Test, TestingModule } from '@nestjs/testing';
import { PlexController } from './plex.controller';
import { Response } from 'express';

jest.mock('../media/media-event.service', () => ({
  MediaEventService: jest.fn().mockImplementation(() => ({
    processPlexWebhook: jest.fn(),
    getCurrentMedia: jest.fn(),
    getActiveUsers: jest.fn(),
  })),
}));

jest.mock('../media/media.service', () => ({
  MediaService: jest.fn().mockImplementation(() => ({
    getCurrentMedia: jest.fn(),
    getActiveUsers: jest.fn(),
    getRecentTracks: jest.fn(),
    getRecentMovies: jest.fn(),
    getRecentEpisodes: jest.fn(),
    getListeningStats: jest.fn(),
    getMovieWatchingStats: jest.fn(),
    getTVWatchingStats: jest.fn(),
    getStats: jest.fn(),
  })),
}));

jest.mock('../thumbnail/thumbnail.service', () => ({
  ThumbnailService: jest.fn().mockImplementation(() => ({
    saveThumbnail: jest.fn(),
    findExistingThumbnail: jest.fn(),
    getThumbnailUrl: jest.fn(),
  })),
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn(),
  }),
}));

import { MediaEventService } from '../media/media-event.service';
import { MediaService } from '../media/media.service';
import { ThumbnailService } from '../thumbnail/thumbnail.service';

describe('PlexController', () => {
  let controller: PlexController;
  let mediaEventService: MediaEventService;
  let mediaService: MediaService;
  let thumbnailService: ThumbnailService;

  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    user: 'TestUser',
  };

  const mockMovie = {
    id: '1',
    title: 'Test Movie',
    year: 2025,
    user: 'TestUser',
  };

  const mockEpisode = {
    id: '1',
    title: 'Test Episode',
    showTitle: 'Test Show',
    user: 'TestUser',
  };

  const mockFile = {
    buffer: Buffer.from('test-image'),
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  };

  const mockActiveUsers = ['TestUser', 'AnotherUser'];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlexController],
      providers: [MediaEventService, MediaService, ThumbnailService],
    }).compile();

    controller = module.get<PlexController>(PlexController);
    mediaEventService = module.get<MediaEventService>(MediaEventService);
    mediaService = module.get<MediaService>(MediaService);
    thumbnailService = module.get<ThumbnailService>(ThumbnailService);

    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date('2025-05-05T15:00:00Z').getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handlePlexWebhook with enhanced metadata', () => {
    it('should process track webhook with parent (album) metadata', async () => {
      const mockTrackPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          title: 'Test Track',
          ratingKey: '12345',
          parentTitle: 'Test Album',
          parentRatingKey: '67890',
        },
        Account: {
          title: 'TestUser',
        },
      };

      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockTrack,
      );
      (thumbnailService.saveThumbnail as jest.Mock).mockResolvedValue(
        'album-thumbnail-id',
      );

      const body = { payload: JSON.stringify(mockTrackPayload) };
      const result = await controller.handlePlexWebhook(
        body,
        mockFile as Express.Multer.File,
      );

      expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith(mockFile, {
        type: 'track',
        title: 'Test Track',
        ratingKey: '12345',
        parentRatingKey: '67890',
        parentTitle: 'Test Album',
        grandparentRatingKey: undefined,
        grandparentTitle: undefined,
      });

      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockTrackPayload,
        'album-thumbnail-id',
      );
      expect(result).toEqual({ success: true });
    });

    it('should process episode webhook with show metadata', async () => {
      const mockEpisodePayload = {
        event: 'media.play',
        Metadata: {
          type: 'episode',
          title: 'Test Episode',
          ratingKey: '12345',
          parentTitle: 'Season 1',
          parentRatingKey: '67890',
          grandparentTitle: 'Test Show',
          grandparentRatingKey: '54321',
        },
        Account: {
          title: 'TestUser',
        },
      };

      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockEpisode,
      );
      (thumbnailService.saveThumbnail as jest.Mock).mockResolvedValue(
        'show-thumbnail-id',
      );

      const result = await controller.handlePlexWebhook(
        mockEpisodePayload,
        mockFile as Express.Multer.File,
      );

      expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith(mockFile, {
        type: 'episode',
        title: 'Test Episode',
        ratingKey: '12345',
        parentRatingKey: '67890',
        parentTitle: 'Season 1',
        grandparentRatingKey: '54321',
        grandparentTitle: 'Test Show',
      });

      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockEpisodePayload,
        'show-thumbnail-id',
      );
      expect(result).toEqual({ success: true });
    });

    it('should process movie webhook', async () => {
      const mockMoviePayload = {
        event: 'media.play',
        Metadata: {
          type: 'movie',
          title: 'Test Movie',
          ratingKey: '12345',
          year: 2025,
        },
        Account: {
          title: 'TestUser',
        },
      };

      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockMovie,
      );
      (thumbnailService.saveThumbnail as jest.Mock).mockResolvedValue(
        'movie-thumbnail-id',
      );

      const result = await controller.handlePlexWebhook(
        mockMoviePayload,
        mockFile as Express.Multer.File,
      );

      expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith(mockFile, {
        type: 'movie',
        title: 'Test Movie',
        ratingKey: '12345',
        parentRatingKey: undefined,
        parentTitle: undefined,
        grandparentRatingKey: undefined,
        grandparentTitle: undefined,
      });

      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockMoviePayload,
        'movie-thumbnail-id',
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle webhook with no thumbnail', async () => {
      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          title: 'Test Track',
        },
        Account: {
          title: 'TestUser',
        },
      };

      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockTrack,
      );

      const result = await controller.handlePlexWebhook(mockPayload, null);

      expect(thumbnailService.saveThumbnail).not.toHaveBeenCalled();
      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockPayload,
        null,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getThumbnail', () => {
    it('should redirect to file storage API when using thumbnailId', async () => {
      const thumbnailId = 'thumbnail-12345';
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailUrl as jest.Mock).mockReturnValue(
        'http://file-storage-api.com/files/id/thumbnail-12345',
      );

      await controller.getThumbnail(thumbnailId, mockResponse);

      expect(thumbnailService.getThumbnailUrl).toHaveBeenCalledWith(
        thumbnailId,
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://file-storage-api.com/files/id/thumbnail-12345',
      );
    });

    it('should return 404 when thumbnail not found', async () => {
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailUrl as jest.Mock).mockReturnValue(null);

      await controller.getThumbnail('nonexistent-id', mockResponse);

      expect(thumbnailService.getThumbnailUrl).toHaveBeenCalledWith(
        'nonexistent-id',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Thumbnail not found',
      });
    });

    it('should handle errors gracefully', async () => {
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.getThumbnail('thumbnail-id', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Failed to serve thumbnail',
      });
    });
  });

  describe('getCurrentMedia', () => {
    it('should return media for a specific type', async () => {
      (mediaService.getCurrentMedia as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);

      const result = await controller.getCurrentMedia('track');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        undefined,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return media for a specific type and user', async () => {
      (mediaService.getCurrentMedia as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);

      const result = await controller.getCurrentMedia('track', 'TestUser');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        'TestUser',
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should return all media types when type is "all"', async () => {
      const allMedia = {
        tracks: [mockTrack],
        movies: [],
        episodes: [],
      };

      (mediaService.getCurrentMedia as jest.Mock).mockResolvedValue(allMedia);

      const result = await controller.getCurrentMedia('all');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith(
        'all',
        undefined,
      );
      expect(result).toEqual(allMedia);
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      (mediaService.getActiveUsers as jest.Mock).mockResolvedValue(
        mockActiveUsers,
      );

      const result = await controller.getActiveUsers();

      expect(mediaService.getActiveUsers).toHaveBeenCalled();
      expect(result).toEqual({ users: mockActiveUsers });
    });
  });

  describe('getHistory', () => {
    it('should get track history', async () => {
      (mediaService.getRecentTracks as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);

      const result = await controller.getHistory('track', 10);

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10, undefined);
      expect(result).toEqual([mockTrack]);
    });

    it('should get track history for a specific user', async () => {
      (mediaService.getRecentTracks as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);

      const result = await controller.getHistory('track', 10, 'TestUser');

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10, 'TestUser');
      expect(result).toEqual([mockTrack]);
    });

    it('should get movie history', async () => {
      (mediaService.getRecentMovies as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);

      const result = await controller.getHistory('movie', 10);

      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(10, undefined);
      expect(result).toEqual([mockMovie]);
    });

    it('should get episode history', async () => {
      (mediaService.getRecentEpisodes as jest.Mock).mockResolvedValue([
        mockEpisode,
      ]);

      const result = await controller.getHistory('episode', 10);

      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(
        10,
        undefined,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get all history types when type is "all"', async () => {
      (mediaService.getRecentTracks as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);
      (mediaService.getRecentMovies as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);
      (mediaService.getRecentEpisodes as jest.Mock).mockResolvedValue([
        mockEpisode,
      ]);

      const result = await controller.getHistory('all', 10);

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10);
      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(10);
      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        tracks: [mockTrack],
        movies: [mockMovie],
        episodes: [mockEpisode],
      });
    });

    it('should get all history types for a specific user', async () => {
      (mediaService.getRecentTracks as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);
      (mediaService.getRecentMovies as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);
      (mediaService.getRecentEpisodes as jest.Mock).mockResolvedValue([
        mockEpisode,
      ]);

      const result = await controller.getHistory('all', 10, 'TestUser');

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10, 'TestUser');
      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(10, 'TestUser');
      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(
        10,
        'TestUser',
      );
      expect(result).toEqual({
        user: 'TestUser',
        tracks: [mockTrack],
        movies: [mockMovie],
        episodes: [mockEpisode],
      });
    });
  });

  describe('getMediaStats', () => {
    it('should get track stats', async () => {
      const trackStats = { totalListeningTimeMs: 3600000 };
      (mediaService.getListeningStats as jest.Mock).mockResolvedValue(
        trackStats,
      );

      const result = await controller.getMediaStats('track', 'week');

      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'week',
        undefined,
      );
      expect(result).toEqual(trackStats);
    });

    it('should get track stats for a specific user', async () => {
      const trackStats = {
        user: 'TestUser',
        totalListeningTimeMs: 3600000,
      };
      (mediaService.getListeningStats as jest.Mock).mockResolvedValue(
        trackStats,
      );

      const result = await controller.getMediaStats(
        'track',
        'week',
        'TestUser',
      );

      expect(mediaService.getListeningStats).toHaveBeenCalledWith(
        'week',
        'TestUser',
      );
      expect(result).toEqual(trackStats);
    });

    it('should get movie stats', async () => {
      const movieStats = { totalWatchTimeMs: 7200000 };
      (mediaService.getMovieWatchingStats as jest.Mock).mockResolvedValue(
        movieStats,
      );

      const result = await controller.getMediaStats('movie', 'week');

      expect(mediaService.getMovieWatchingStats).toHaveBeenCalledWith(
        'week',
        undefined,
      );
      expect(result).toEqual(movieStats);
    });

    it('should get episode stats', async () => {
      const tvStats = { totalWatchTimeMs: 10800000 };
      (mediaService.getTVWatchingStats as jest.Mock).mockResolvedValue(tvStats);

      const result = await controller.getMediaStats('episode', 'week');

      expect(mediaService.getTVWatchingStats).toHaveBeenCalledWith(
        'week',
        undefined,
      );
      expect(result).toEqual(tvStats);
    });

    it('should get all stats types when type is "all"', async () => {
      const combinedStats = {
        music: { totalListeningTimeMs: 3600000 },
        movies: { totalWatchTimeMs: 7200000 },
        tv: { totalWatchTimeMs: 10800000 },
      };

      (mediaService.getStats as jest.Mock).mockResolvedValue(combinedStats);

      const result = await controller.getMediaStats('all', 'week');

      expect(mediaService.getStats).toHaveBeenCalledWith('week', undefined);
      expect(result).toEqual(combinedStats);
    });

    it('should get all stats types for a specific user', async () => {
      const combinedStats = {
        user: 'TestUser',
        music: { totalListeningTimeMs: 3600000 },
        movies: { totalWatchTimeMs: 7200000 },
        tv: { totalWatchTimeMs: 10800000 },
      };

      (mediaService.getStats as jest.Mock).mockResolvedValue(combinedStats);

      const result = await controller.getMediaStats('all', 'week', 'TestUser');

      expect(mediaService.getStats).toHaveBeenCalledWith('week', 'TestUser');
      expect(result).toEqual(combinedStats);
    });
  });
});
