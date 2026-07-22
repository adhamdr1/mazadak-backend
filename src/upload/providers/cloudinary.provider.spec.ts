import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryProvider } from './cloudinary.provider';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { ImageUploadFailedException } from '../exceptions/image-upload-failed.exception';
import { InvalidImageFormatException } from '../exceptions/invalid-image-format.exception';
import { ImageTooLargeException } from '../exceptions/image-too-large.exception';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryProvider', () => {
  let provider: CloudinaryProvider;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'CLOUDINARY_CLOUD_NAME') return 'test_cloud';
      if (key === 'CLOUDINARY_API_KEY') return 'test_key';
      if (key === 'CLOUDINARY_API_SECRET') return 'test_secret';
      throw new Error(`Unexpected config key: ${key}`);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<CloudinaryProvider>(CloudinaryProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should configure cloudinary on initialization', () => {
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
      'CLOUDINARY_CLOUD_NAME',
    );
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
      'CLOUDINARY_API_KEY',
    );
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
      'CLOUDINARY_API_SECRET',
    );
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test_cloud',
      api_key: 'test_key',
      api_secret: 'test_secret',
    });
  });

  describe('uploadImage', () => {
    it('should throw ImageTooLargeException if base64 is too long', async () => {
      const hugeBase64 = 'a'.repeat(7000001);
      await expect(provider.uploadImage(hugeBase64)).rejects.toThrow(
        ImageTooLargeException,
      );
    });

    it('should throw InvalidImageFormatException if base64 header is missing', async () => {
      const invalidBase64 = 'just_some_random_string';
      await expect(provider.uploadImage(invalidBase64)).rejects.toThrow(
        InvalidImageFormatException,
      );
    });

    it('should throw InvalidImageFormatException if mime type is not allowed', async () => {
      const invalidMimeBase64 = 'data:image/svg+xml;base64,PHN2...';
      await expect(provider.uploadImage(invalidMimeBase64)).rejects.toThrow(
        InvalidImageFormatException,
      );
    });

    it('should successfully upload a valid image and return url', async () => {
      const validBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const expectedUrl =
        'https://res.cloudinary.com/test_cloud/image/upload/v123/general/test.png';

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
        secure_url: expectedUrl,
      });

      const result = await provider.uploadImage(validBase64);

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(validBase64, {
        folder: 'general',
        resource_type: 'image',
      });
      expect(result).toBe(expectedUrl);
    });

    it('should use provided folder name', async () => {
      const validBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const expectedUrl =
        'https://res.cloudinary.com/test_cloud/image/upload/v123/custom_folder/test.png';

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
        secure_url: expectedUrl,
      });

      const result = await provider.uploadImage(validBase64, 'custom_folder');

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(validBase64, {
        folder: 'custom_folder',
        resource_type: 'image',
      });
      expect(result).toBe(expectedUrl);
    });

    it('should throw ImageUploadFailedException on upload failure', async () => {
      const validBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(
        new Error('Cloudinary error'),
      );

      await expect(provider.uploadImage(validBase64)).rejects.toThrow(
        ImageUploadFailedException,
      );
    });
  });

  describe('deleteImage', () => {
    it('should extract publicId and call destroy', async () => {
      const url =
        'https://res.cloudinary.com/test_cloud/image/upload/v1234567/avatars/user123.jpg';

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue(true);

      await provider.deleteImage(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'avatars/user123',
      );
    });

    it('should handle URL without version', async () => {
      const url =
        'https://res.cloudinary.com/test_cloud/image/upload/avatars/user123.jpg';

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue(true);

      await provider.deleteImage(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'avatars/user123',
      );
    });

    it('should gracefully handle extraction failure (no /upload/)', async () => {
      const url = 'https://example.com/invalid_url.jpg';

      await provider.deleteImage(url);

      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should gracefully handle destroy errors without throwing', async () => {
      const url =
        'https://res.cloudinary.com/test_cloud/image/upload/v1234567/avatars/user123.jpg';

      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error('Destroy failed'),
      );

      // Should not throw
      await expect(provider.deleteImage(url)).resolves.not.toThrow();
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'avatars/user123',
      );
    });
  });
});
