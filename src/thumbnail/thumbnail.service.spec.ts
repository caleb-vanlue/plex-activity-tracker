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

  describe('findExistingThumbnail', () => {
    it('should find existing thumbnail by movie rating key', async () => {
      const mockResponse = {
        data: {
          id: 'movie-thumbnail-id',
          filename: 'movie-thumb.jpg',
          mimeType: 'image/jpeg',
          plexMediaType: 'movie',
          plexRatingKey: '12345',
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await service.findExistingThumbnail({
        type: 'movie',
        ratingKey: '12345',
      });

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockApiUrl}/files/plex/thumbnail`,
        {
          params: {
            mediaType: 'movie',
            ratingKey: '12345',
          },
        },
      );

      expect(result).toBe('movie-thumbnail-id');
    });

    it('should find existing thumbnail by show rating key for episodes', async () => {
      const mockResponse = {
        data: {
          id: 'show-thumbnail-id',
          filename: 'show-thumb.jpg',
          mimeType: 'image/jpeg',
          plexMediaType: 'episode',
          plexGrandparentRatingKey: '67890',
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await service.findExistingThumbnail({
        type: 'episode',
        grandparentRatingKey: '67890',
      });

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockApiUrl}/files/plex/thumbnail`,
        {
          params: {
            mediaType: 'episode',
            grandparentRatingKey: '67890',
          },
        },
      );

      expect(result).toBe('show-thumbnail-id');
    });

    it('should find existing thumbnail by album rating key for tracks', async () => {
      const mockResponse = {
        data: {
          id: 'album-thumbnail-id',
          filename: 'album-thumb.jpg',
          mimeType: 'image/jpeg',
          plexMediaType: 'track',
          plexParentRatingKey: '54321',
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await service.findExistingThumbnail({
        type: 'track',
        parentRatingKey: '54321',
      });

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockApiUrl}/files/plex/thumbnail`,
        {
          params: {
            mediaType: 'track',
            parentRatingKey: '54321',
          },
        },
      );

      expect(result).toBe('album-thumbnail-id');
    });

    it('should return null if file storage API returns 404', async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
          notFound: true,
        })),
      );

      const result = await service.findExistingThumbnail({
        type: 'movie',
        ratingKey: '12345',
      });

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('API error')),
      );

      const result = await service.findExistingThumbnail({
        type: 'movie',
        ratingKey: '12345',
      });

      expect(httpService.get).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('saveThumbnail with enhanced metadata', () => {
    it('should return existing thumbnail ID if found', async () => {
      // Mock findExistingThumbnail to return an ID
      jest
        .spyOn(service, 'findExistingThumbnail')
        .mockResolvedValue('existing-thumbnail-id');

      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'thumbnail.jpg',
        mimetype: 'image/jpeg',
      };

      const result = await service.saveThumbnail(mockFile as any, {
        type: 'movie',
        title: 'Test Movie',
        ratingKey: '12345',
      });

      expect(service.findExistingThumbnail).toHaveBeenCalledWith({
        type: 'movie',
        ratingKey: '12345',
      });

      // Should not make a POST request if existing thumbnail found
      expect(httpService.post).not.toHaveBeenCalled();
      expect(result).toBe('existing-thumbnail-id');
    });

    it('should upload track thumbnail with album reference', async () => {
      // Mock findExistingThumbnail to return null (no thumbnail found)
      jest.spyOn(service, 'findExistingThumbnail').mockResolvedValue(null);

      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'track.jpg',
        mimetype: 'image/jpeg',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockFileResponse,
        }),
      );

      const result = await service.saveThumbnail(mockFile as any, {
        type: 'track',
        title: 'Test Track',
        ratingKey: '12345',
        parentRatingKey: '67890',
        parentTitle: 'Test Album',
      });

      expect(service.findExistingThumbnail).toHaveBeenCalledWith({
        type: 'track',
        ratingKey: '12345',
        parentRatingKey: '67890',
      });

      expect(httpService.post).toHaveBeenCalled();

      // Verify that parent rating key is used as the reference ID for tracks
      const postCallArgs = (httpService.post as jest.Mock).mock.calls[0];
      const formData = postCallArgs[1];

      // Can't directly test FormData, but we can check that post was called
      expect(postCallArgs[0]).toBe(`${mockApiUrl}/files/upload`);
      expect(result).toBe(mockFileResponse.id);
    });

    it('should upload episode thumbnail with show reference', async () => {
      // Mock findExistingThumbnail to return null (no thumbnail found)
      jest.spyOn(service, 'findExistingThumbnail').mockResolvedValue(null);

      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'episode.jpg',
        mimetype: 'image/jpeg',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockFileResponse,
        }),
      );

      const result = await service.saveThumbnail(mockFile as any, {
        type: 'episode',
        title: 'Test Episode',
        ratingKey: '12345',
        parentRatingKey: '67890', // Season
        parentTitle: 'Season 1',
        grandparentRatingKey: '54321', // Show
        grandparentTitle: 'Test Show',
      });

      expect(service.findExistingThumbnail).toHaveBeenCalledWith({
        type: 'episode',
        ratingKey: '12345',
        parentRatingKey: '67890',
        grandparentRatingKey: '54321',
      });

      expect(httpService.post).toHaveBeenCalled();

      // Verify the post was called
      const postCallArgs = (httpService.post as jest.Mock).mock.calls[0];
      expect(postCallArgs[0]).toBe(`${mockApiUrl}/files/upload`);
      expect(result).toBe(mockFileResponse.id);
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
