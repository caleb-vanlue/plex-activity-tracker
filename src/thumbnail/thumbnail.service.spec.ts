import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ThumbnailService } from './thumbnail.service';
import { of, throwError } from 'rxjs';

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  let httpService: HttpService;
  let configService: ConfigService;
  const mockApiUrl = 'http://test-api.com/files';

  const mockFileResponse = {
    id: 'mocked-file-id',
    filename: 'mocked-uuid.jpg',
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 12345,
    url: '/files/mocked-file-id',
  };

  beforeEach(async () => {
    const httpServiceMock = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const configServiceMock = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'FILE_STORAGE_API_URL') {
          return mockApiUrl;
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThumbnailService,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<ThumbnailService>(ThumbnailService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveThumbnail', () => {
    it('should upload thumbnail from file buffer and return file ID', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockFileResponse,
        }),
      );

      const result = await service.saveThumbnail(mockFile as any);

      expect(httpService.post).toHaveBeenCalled();
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockApiUrl}/files/upload`,
        expect.anything(),
        expect.anything(),
      );
      expect(result).toBe(mockFileResponse.id);
    });

    it('should upload thumbnail with reference metadata when provided', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockFileResponse,
        }),
      );

      const result = await service.saveThumbnail(
        mockFile as any,
        'test-type',
        'test-id',
      );

      expect(httpService.post).toHaveBeenCalled();
      expect(result).toBe(mockFileResponse.id);
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('HTTP error')),
      );

      const result = await service.saveThumbnail(mockFile as any);

      expect(result).toBeNull();
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return the correct URL for a file ID', () => {
      const fileId = 'test-file-id';
      const result = service.getThumbnailUrl(fileId);
      expect(result).toBe(`${mockApiUrl}/id/${fileId}`);
    });

    it('should return null for empty file ID', () => {
      const result = service.getThumbnailUrl('');
      expect(result).toBeNull();
    });
  });
});
