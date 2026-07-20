import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import type { IStorageProvider } from './interfaces/storage-provider.interface';

@Injectable()
export class UploadService {
  constructor(
    @Inject('IStorageProvider')
    private readonly storageProvider: IStorageProvider,
  ) {}

  async uploadImage(
    userId: string,
    base64Data: string,
    folderName?: string,
  ): Promise<string> {
    const folderPath = folderName
      ? `users/${userId}/${folderName}`
      : `users/${userId}/general`;

    return this.storageProvider.uploadImage(base64Data, folderPath);
  }

  async deleteImage(userId: string, url: string): Promise<void> {
    const userFolder = `users/${userId}/`;
    if (!url.includes(userFolder)) {
      throw new ForbiddenException('You are not allowed to delete this image');
    }

    return this.storageProvider.deleteImage(url);
  }
}
