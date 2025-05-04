import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlexController } from './plex.controller';
import { Logger } from '@nestjs/common';

describe('PlexController', () => {
  let controller: PlexController;
  let eventEmitter: EventEmitter2;
  let loggerSpy: jest.SpyInstance;
  let emitSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlexController],
      providers: [
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PlexController>(PlexController);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    emitSpy = jest.spyOn(eventEmitter, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handlePlexWebhook', () => {
    it('should handle track play event correctly', async () => {
      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
        Account: { title: 'TestUser' },
        Player: { title: 'Plexamp' },
      };

      const mockThumbnail = {
        filename: 'test-thumbnail.jpg',
      } as Express.Multer.File;

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(
        mockBody,
        mockThumbnail,
      );

      expect(result).toEqual({ success: true });

      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.play',
          ratingKey: '12345',
          title: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          state: 'playing',
          user: 'TestUser',
          player: 'Plexamp',
          thumbnailUrl: '/thumbnails/test-thumbnail.jpg',
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track playing: Test Track by Test Artist'),
      );
    });

    it('should handle track pause event correctly', async () => {
      const mockPayload = {
        event: 'media.pause',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.pause',
          state: 'paused',
          thumbnailUrl: null,
        }),
      );
    });

    it('should handle track stop event correctly', async () => {
      const mockPayload = {
        event: 'media.stop',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.stop',
          state: 'stopped',
        }),
      );
    });

    it('should handle track resume event correctly', async () => {
      const mockPayload = {
        event: 'media.resume',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.resume',
          state: 'playing',
        }),
      );
    });

    it('should ignore non-track events', async () => {
      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'movie',
          title: 'Test Movie',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should handle unknown event types correctly', async () => {
      const mockPayload = {
        event: 'media.scrobble',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.scrobble',
          state: 'unknown',
        }),
      );
    });

    it('should handle payload directly if not in payload field', async () => {
      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
          grandparentTitle: 'Test Artist',
          parentTitle: 'Test Album',
        },
      };

      const result = await controller.handlePlexWebhook(mockPayload, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.play',
          state: 'playing',
        }),
      );
    });

    it('should handle invalid JSON in payload field', async () => {
      const mockBody = { payload: 'not valid json' };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Unexpected token'),
      });
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should handle missing Metadata field', async () => {
      const mockPayload = {
        event: 'media.play',
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should handle missing required fields in Metadata', async () => {
      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({ success: true });
      expect(emitSpy).toHaveBeenCalledWith(
        'plex.trackEvent',
        expect.objectContaining({
          eventType: 'media.play',
          title: undefined,
          artist: undefined,
          album: undefined,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      emitSpy.mockImplementation(() => {
        throw new Error('Test error');
      });

      const mockPayload = {
        event: 'media.play',
        Metadata: {
          type: 'track',
          ratingKey: '12345',
          title: 'Test Track',
        },
      };

      const mockBody = { payload: JSON.stringify(mockPayload) };

      const result = await controller.handlePlexWebhook(mockBody, null);

      expect(result).toEqual({
        success: false,
        error: 'Test error',
      });
    });
  });

  describe('mapEventToState', () => {
    it('should map media.play to playing state', () => {
      const result = controller['mapEventToState']('media.play');
      expect(result).toBe('playing');
    });

    it('should map media.resume to playing state', () => {
      const result = controller['mapEventToState']('media.resume');
      expect(result).toBe('playing');
    });

    it('should map media.pause to paused state', () => {
      const result = controller['mapEventToState']('media.pause');
      expect(result).toBe('paused');
    });

    it('should map media.stop to stopped state', () => {
      const result = controller['mapEventToState']('media.stop');
      expect(result).toBe('stopped');
    });

    it('should map unknown event to unknown state', () => {
      const result = controller['mapEventToState']('media.unknown');
      expect(result).toBe('unknown');
    });
  });
});
