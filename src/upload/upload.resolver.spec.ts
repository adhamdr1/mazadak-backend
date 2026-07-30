import { Test, TestingModule } from '@nestjs/testing';
import { UploadResolver } from './upload.resolver';
import { UploadService } from './upload.service';
import { UploadImageInput } from './dto/upload-image.input';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

const mockUploadService = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  generateUploadSignature: jest.fn(),
};

describe('UploadResolver', () => {
  let resolver: UploadResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadResolver,
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    resolver = module.get<UploadResolver>(UploadResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should call uploadService.uploadImage and return url', async () => {
      const mockUser: JwtPayload = {
        sub: 'user123',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const input: UploadImageInput = {
        base64Data: 'data:image/png;base64,...',
        folder: 'avatars',
      };
      const expectedUrl = 'https://example.com/image.png';

      mockUploadService.uploadImage.mockResolvedValue(expectedUrl);

      const result = await resolver.uploadImage(mockUser, input);

      expect(mockUploadService.uploadImage).toHaveBeenCalledWith(
        mockUser.sub,
        input.base64Data,
        input.folder,
      );
      expect(result).toEqual({ url: expectedUrl });
    });
  });

  describe('deleteImage', () => {
    it('should call uploadService.deleteImage and return true', async () => {
      const mockUser: JwtPayload = {
        sub: 'user123',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const url = 'https://example.com/image.png';

      mockUploadService.deleteImage.mockResolvedValue(undefined);

      const result = await resolver.deleteImage(mockUser, url);

      expect(mockUploadService.deleteImage).toHaveBeenCalledWith(
        mockUser.sub,
        url,
      );
      expect(result).toBe(true);
    });
  });

  describe('generateUploadSignature', () => {
    it('should call uploadService.generateUploadSignature and return signature', async () => {
      const mockUser: JwtPayload = {
        sub: 'user123',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const folder = 'avatars';
      const mockSignature = {
        signature: 'mock',
        timestamp: 123,
        apiKey: 'key',
        cloudName: 'cloud',
        folder: 'users/user123/avatars',
      };

      mockUploadService.generateUploadSignature.mockResolvedValue(
        mockSignature,
      );

      const result = await resolver.generateUploadSignature(mockUser, folder);

      expect(mockUploadService.generateUploadSignature).toHaveBeenCalledWith(
        mockUser.sub,
        folder,
      );
      expect(result).toEqual(mockSignature);
    });
  });
});
