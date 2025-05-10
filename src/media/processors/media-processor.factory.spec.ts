import { Test, TestingModule } from '@nestjs/testing';
import { MediaProcessorFactory } from '../processors/media-processor.factory';
import { TrackProcessor } from '../processors/track.processor';
import { MovieProcessor } from '../processors/movie.processor';
import { EpisodeProcessor } from '../processors/episode.processor';

describe('MediaProcessorFactory', () => {
  let factory: MediaProcessorFactory;
  let trackProcessor: TrackProcessor;
  let movieProcessor: MovieProcessor;
  let episodeProcessor: EpisodeProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaProcessorFactory,
        {
          provide: TrackProcessor,
          useValue: { processEvent: jest.fn() },
        },
        {
          provide: MovieProcessor,
          useValue: { processEvent: jest.fn() },
        },
        {
          provide: EpisodeProcessor,
          useValue: { processEvent: jest.fn() },
        },
      ],
    }).compile();

    factory = module.get<MediaProcessorFactory>(MediaProcessorFactory);
    trackProcessor = module.get<TrackProcessor>(TrackProcessor);
    movieProcessor = module.get<MovieProcessor>(MovieProcessor);
    episodeProcessor = module.get<EpisodeProcessor>(EpisodeProcessor);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
    expect(trackProcessor).toBeDefined();
    expect(movieProcessor).toBeDefined();
    expect(episodeProcessor).toBeDefined();
  });

  describe('getProcessor', () => {
    it('should return TrackProcessor for track media type', () => {
      const processor = factory.getProcessor('track');
      expect(processor).toBe(trackProcessor);
    });

    it('should return MovieProcessor for movie media type', () => {
      const processor = factory.getProcessor('movie');
      expect(processor).toBe(movieProcessor);
    });

    it('should return EpisodeProcessor for episode media type', () => {
      const processor = factory.getProcessor('episode');
      expect(processor).toBe(episodeProcessor);
    });

    it('should throw an error for unsupported media types', () => {
      expect(() => factory.getProcessor('unknown')).toThrow(
        'Unsupported media type: unknown',
      );
    });

    it('should handle media type case sensitivity correctly', () => {
      expect(() => factory.getProcessor('TRACK')).toThrow(
        'Unsupported media type: TRACK',
      );
    });

    it('should handle undefined media type', () => {
      expect(() => factory.getProcessor(undefined as any)).toThrow(
        'Unsupported media type: undefined',
      );
    });
  });

  describe('getProcessorForPayload', () => {
    it('should extract media type from payload metadata and return correct processor', () => {
      const payload = {
        Metadata: {
          type: 'track',
        },
      };

      const processor = factory.getProcessorForPayload(payload);
      expect(processor).toBe(trackProcessor);
    });

    it('should throw an error if payload is missing Metadata', () => {
      const payload = {};

      expect(() => factory.getProcessorForPayload(payload)).toThrow(
        'Missing media type in webhook payload',
      );
    });

    it('should throw an error if payload Metadata is missing type', () => {
      const payload = {
        Metadata: {},
      };

      expect(() => factory.getProcessorForPayload(payload)).toThrow(
        'Missing media type in webhook payload',
      );
    });

    it('should throw an error for unsupported media types in payload', () => {
      const payload = {
        Metadata: {
          type: 'unknown',
        },
      };

      expect(() => factory.getProcessorForPayload(payload)).toThrow(
        'Unsupported media type: unknown',
      );
    });
  });
});
