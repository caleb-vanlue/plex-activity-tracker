import { Test, TestingModule } from '@nestjs/testing';
import { PlexController } from './plex.controller';
import { Response } from 'express';

jest.mock('../media/media-event.service', () => ({
  MediaEventService: jest.fn().mockImplementation(() => ({
    processPlexWebhook: jest.fn(),
    getCurrentMedia: jest.fn(),
  })),
}));

jest.mock('../media/media.service', () => ({
  MediaService: jest.fn().mockImplementation(() => ({
    getCurrentMedia: jest.fn(),
    getRecentTracks: jest.fn(),
    getRecentMovies: jest.fn(),
    getRecentEpisodes: jest.fn(),
    getListeningStats: jest.fn(),
    getMovieWatchingStats: jest.fn(),
    getTVWatchingStats: jest.fn(),
  })),
}));

jest.mock('../thumbnail/thumbnail.service', () => ({
  ThumbnailService: jest.fn().mockImplementation(() => ({
    saveThumbnail: jest.fn(),
    getThumbnailPath: jest.fn(),
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
import { createReadStream } from 'fs';

describe('PlexController', () => {
  let controller: PlexController;
  let mediaEventService: MediaEventService;
  let mediaService: MediaService;
  let thumbnailService: ThumbnailService;

  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
  };

  const mockMovie = {
    id: '1',
    title: 'Test Movie',
    year: 2025,
  };

  const mockEpisode = {
    id: '1',
    title: 'Test Episode',
    showTitle: 'Test Show',
  };

  const mockFile = {
    buffer: Buffer.from('test-image'),
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  };

  const mockPlexPayload = {
    event: 'media.play',
    Metadata: {
      type: 'track',
      title: 'Test Track',
    },
  };

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

  describe('handlePlexWebhook', () => {
    it('should process webhook with JSON payload', async () => {
      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockTrack,
      );
      (thumbnailService.saveThumbnail as jest.Mock).mockResolvedValue(
        'test-thumbnail.jpg',
      );

      const body = { payload: JSON.stringify(mockPlexPayload) };
      const result = await controller.handlePlexWebhook(
        body,
        mockFile as Express.Multer.File,
      );

      expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith(mockFile);
      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockPlexPayload,
        'test-thumbnail.jpg',
      );
      expect(result).toEqual({ success: true });
    });

    it('should process webhook with direct payload', async () => {
      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockTrack,
      );
      (thumbnailService.saveThumbnail as jest.Mock).mockResolvedValue(
        'test-thumbnail.jpg',
      );

      const result = await controller.handlePlexWebhook(
        mockPlexPayload,
        mockFile as Express.Multer.File,
      );

      expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith(mockFile);
      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockPlexPayload,
        'test-thumbnail.jpg',
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle webhook without thumbnail', async () => {
      (mediaEventService.processPlexWebhook as jest.Mock).mockResolvedValue(
        mockTrack,
      );

      const result = await controller.handlePlexWebhook(mockPlexPayload, null);

      expect(thumbnailService.saveThumbnail).not.toHaveBeenCalled();
      expect(mediaEventService.processPlexWebhook).toHaveBeenCalledWith(
        mockPlexPayload,
        null,
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle errors gracefully', async () => {
      (mediaEventService.processPlexWebhook as jest.Mock).mockRejectedValue(
        new Error('Test error'),
      );

      const result = await controller.handlePlexWebhook(mockPlexPayload, null);

      expect(result).toEqual({
        success: false,
        error: 'Test error',
      });
    });
  });

  describe('getThumbnail', () => {
    it('should serve thumbnail when found', async () => {
      const mockPath = '/path/to/thumbnail.jpg';
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailPath as jest.Mock).mockResolvedValue(
        mockPath,
      );

      await controller.getThumbnail('thumbnail.jpg', mockResponse);

      expect(thumbnailService.getThumbnailPath).toHaveBeenCalledWith(
        'thumbnail.jpg',
      );
      expect(createReadStream).toHaveBeenCalledWith(mockPath);
    });

    it('should return 404 when thumbnail not found', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailPath as jest.Mock).mockResolvedValue(null);

      await controller.getThumbnail('nonexistent.jpg', mockResponse);

      expect(thumbnailService.getThumbnailPath).toHaveBeenCalledWith(
        'nonexistent.jpg',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Thumbnail not found',
      });
    });

    it('should handle errors gracefully', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      (thumbnailService.getThumbnailPath as jest.Mock).mockRejectedValue(
        new Error('Test error'),
      );

      await controller.getThumbnail('thumbnail.jpg', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Failed to serve thumbnail',
      });
    });
  });

  describe('getCurrentMedia', () => {
    it('should return media for a specific type', async () => {
      (mediaService.getCurrentMedia as jest.Mock).mockResolvedValue(mockTrack);

      const result = await controller.getCurrentMedia('track');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith('track');
      expect(result).toEqual(mockTrack);
    });

    it('should return all media types when type is "all"', async () => {
      (mediaService.getCurrentMedia as jest.Mock).mockResolvedValueOnce({
        track: mockTrack,
        movie: mockMovie,
        episode: mockEpisode,
      });

      const result = await controller.getCurrentMedia('all');

      expect(mediaService.getCurrentMedia).toHaveBeenCalledWith('all');
      expect(result).toEqual({
        track: mockTrack,
        movie: mockMovie,
        episode: mockEpisode,
      });
    });
  });

  describe('getHistory', () => {
    it('should get track history', async () => {
      (mediaService.getRecentTracks as jest.Mock).mockResolvedValue([
        mockTrack,
      ]);

      const result = await controller.getHistory('track', 10);

      expect(mediaService.getRecentTracks).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get movie history', async () => {
      (mediaService.getRecentMovies as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);

      const result = await controller.getHistory('movie', 10);

      expect(mediaService.getRecentMovies).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get episode history', async () => {
      (mediaService.getRecentEpisodes as jest.Mock).mockResolvedValue([
        mockEpisode,
      ]);

      const result = await controller.getHistory('episode', 10);

      expect(mediaService.getRecentEpisodes).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockEpisode]);
    });

    it('should get combined history when type is "all"', async () => {
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
  });

  describe('getMediaStats', () => {
    it('should get track stats', async () => {
      const trackStats = { totalListeningTimeMs: 3600000 };
      (mediaService.getListeningStats as jest.Mock).mockResolvedValue(
        trackStats,
      );

      const result = await controller.getMediaStats('track', 'week');

      expect(mediaService.getListeningStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(trackStats);
    });

    it('should get movie stats', async () => {
      const movieStats = { totalWatchTimeMs: 7200000 };
      (mediaService.getMovieWatchingStats as jest.Mock).mockResolvedValue(
        movieStats,
      );

      const result = await controller.getMediaStats('movie', 'week');

      expect(mediaService.getMovieWatchingStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(movieStats);
    });

    it('should get episode stats', async () => {
      const tvStats = { totalWatchTimeMs: 10800000 };
      (mediaService.getTVWatchingStats as jest.Mock).mockResolvedValue(tvStats);

      const result = await controller.getMediaStats('episode', 'week');

      expect(mediaService.getTVWatchingStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(tvStats);
    });

    it('should get combined stats when type is "all"', async () => {
      const musicStats = { totalListeningTimeMs: 3600000 };
      const movieStats = { totalWatchTimeMs: 7200000 };
      const tvStats = { totalWatchTimeMs: 10800000 };

      (mediaService.getListeningStats as jest.Mock).mockResolvedValue(
        musicStats,
      );
      (mediaService.getMovieWatchingStats as jest.Mock).mockResolvedValue(
        movieStats,
      );
      (mediaService.getTVWatchingStats as jest.Mock).mockResolvedValue(tvStats);

      const result = await controller.getMediaStats('all', 'week');

      expect(mediaService.getListeningStats).toHaveBeenCalledWith('week');
      expect(mediaService.getMovieWatchingStats).toHaveBeenCalledWith('week');
      expect(mediaService.getTVWatchingStats).toHaveBeenCalledWith('week');
      expect(result).toEqual({
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      });
    });
  });
});
