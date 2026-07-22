import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { ForbiddenException } from '@nestjs/common';

const mockStorageProvider = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: 'IStorageProvider',
          useValue: mockStorageProvider,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should upload image with specific folder', async () => {
      const userId = 'user123';
      const base64Data = 'data:image/png;base64,...';
      const folder = 'avatars';
      const expectedUrl = 'https://example.com/image.png';

      mockStorageProvider.uploadImage.mockResolvedValue(expectedUrl);

      const result = await service.uploadImage(userId, base64Data, folder);

      expect(mockStorageProvider.uploadImage).toHaveBeenCalledWith(
        base64Data,
        `users/${userId}/${folder}`,
      );
      expect(result).toBe(expectedUrl);
    });

    it('should upload image to general folder if no folder provided', async () => {
      const userId = 'user123';
      const base64Data = 'data:image/png;base64,...';
      const expectedUrl = 'https://example.com/image.png';

      mockStorageProvider.uploadImage.mockResolvedValue(expectedUrl);

      const result = await service.uploadImage(userId, base64Data);

      expect(mockStorageProvider.uploadImage).toHaveBeenCalledWith(
        base64Data,
        `users/${userId}/general`,
      );
      expect(result).toBe(expectedUrl);
    });
  });

  describe('deleteImage', () => {
    it('should delete image if url contains user folder', async () => {
      const userId = 'user123';
      const url = `https://example.com/users/${userId}/avatars/image.png`;

      mockStorageProvider.deleteImage.mockResolvedValue(undefined);

      await service.deleteImage(userId, url);

      expect(mockStorageProvider.deleteImage).toHaveBeenCalledWith(url);
    });

    it('should throw ForbiddenException if url does not contain user folder', async () => {
      const userId = 'user123';
      const url = `https://example.com/users/otherUser/avatars/image.png`;

      await expect(service.deleteImage(userId, url)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockStorageProvider.deleteImage).not.toHaveBeenCalled();
    });
  });
});
