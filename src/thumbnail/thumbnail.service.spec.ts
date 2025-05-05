import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailService } from './thumbnail.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('path', () => ({
  join: jest.fn((a, b) => `${a}/${b}`),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  const defaultStoragePath = './uploads/thumbnails';

  beforeEach(async () => {
    jest.clearAllMocks();

    const originalEnv = process.env;

    process.env = { ...originalEnv };
    delete process.env.THUMBNAIL_STORAGE_PATH;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ThumbnailService],
    }).compile();

    service = module.get<ThumbnailService>(ThumbnailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveThumbnail', () => {
    it('should save thumbnail from file path', async () => {
      const mockFile = {
        path: '/tmp/upload-123456',
        originalname: 'image.jpg',
      };

      (join as jest.Mock).mockImplementation((a, b) => `${a}/${b}`);
      (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid');

      const result = await service.saveThumbnail(mockFile as any);

      expect(fs.mkdir).toHaveBeenCalledWith(defaultStoragePath, {
        recursive: true,
      });
      expect(join).toHaveBeenCalledWith(defaultStoragePath, 'mocked-uuid.jpg');
      expect(fs.copyFile).toHaveBeenCalledWith(
        mockFile.path,
        `${defaultStoragePath}/mocked-uuid.jpg`,
      );
      expect(fs.unlink).toHaveBeenCalledWith(mockFile.path);
      expect(result).toBe('mocked-uuid.jpg');
    });

    it('should save thumbnail from file buffer', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.png',
      };

      const result = await service.saveThumbnail(mockFile as any);

      expect(fs.mkdir).toHaveBeenCalledWith(defaultStoragePath, {
        recursive: true,
      });
      expect(join).toHaveBeenCalledWith(defaultStoragePath, 'mocked-uuid.png');
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${defaultStoragePath}/mocked-uuid.png`,
        mockFile.buffer,
      );
      expect(result).toBe('mocked-uuid.png');
    });

    it('should use custom storage path when environment variable is set', async () => {
      process.env.THUMBNAIL_STORAGE_PATH = '/custom/path';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ThumbnailService],
      }).compile();

      service = module.get<ThumbnailService>(ThumbnailService);

      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.jpg',
      };

      const result = await service.saveThumbnail(mockFile as any);

      expect(fs.mkdir).toHaveBeenCalledWith('/custom/path', {
        recursive: true,
      });
      expect(join).toHaveBeenCalledWith('/custom/path', 'mocked-uuid.jpg');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/custom/path/mocked-uuid.jpg',
        mockFile.buffer,
      );
      expect(result).toBe('mocked-uuid.jpg');
    });

    it('should handle errors during save', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'image.jpg',
      };

      (fs.mkdir as jest.Mock).mockRejectedValueOnce(new Error('mkdir error'));

      const result = await service.saveThumbnail(mockFile as any);

      expect(fs.mkdir).toHaveBeenCalledWith(defaultStoragePath, {
        recursive: true,
      });
      expect(result).toBeNull();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockFile = {
        path: '/tmp/upload-123456',
        originalname: 'image.jpg',
      };

      (fs.unlink as jest.Mock).mockRejectedValueOnce(new Error('unlink error'));

      const result = await service.saveThumbnail(mockFile as any);

      expect(fs.copyFile).toHaveBeenCalledWith(
        mockFile.path,
        `${defaultStoragePath}/mocked-uuid.jpg`,
      );
      expect(fs.unlink).toHaveBeenCalledWith(mockFile.path);
      expect(result).toBe('mocked-uuid.jpg');
    });
  });

  describe('getThumbnailPath', () => {
    it('should return full path for valid filename', async () => {
      const filename = 'test-thumbnail.jpg';

      const result = await service.getThumbnailPath(filename);

      expect(join).toHaveBeenCalledWith(defaultStoragePath, filename);
      expect(result).toBe(`${defaultStoragePath}/${filename}`);
    });

    it('should return null for empty filename', async () => {
      const result = await service.getThumbnailPath('');

      expect(join).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should use custom storage path when environment variable is set', async () => {
      process.env.THUMBNAIL_STORAGE_PATH = '/custom/path';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ThumbnailService],
      }).compile();

      service = module.get<ThumbnailService>(ThumbnailService);

      const filename = 'test-thumbnail.jpg';

      const result = await service.getThumbnailPath(filename);

      expect(join).toHaveBeenCalledWith('/custom/path', filename);
      expect(result).toBe('/custom/path/test-thumbnail.jpg');
    });
  });
});
