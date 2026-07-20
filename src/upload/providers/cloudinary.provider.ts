import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { ImageUploadFailedException } from '../exceptions/image-upload-failed.exception';
import { InvalidImageFormatException } from '../exceptions/invalid-image-format.exception';
import { ImageTooLargeException } from '../exceptions/image-too-large.exception';
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

// 5MB limit in Base64 (5 * 1024 * 1024 * 1.33)
const MAX_BASE64_LENGTH = 7000000;

@Injectable()
export class CloudinaryProvider implements IStorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
    });
  }

  async uploadImage(base64Data: string, folder?: string): Promise<string> {
    // 0. Validate size to prevent memory exhaustion (Base64 is ~33% larger than binary)
    if (base64Data.length > MAX_BASE64_LENGTH) {
      throw new ImageTooLargeException();
    }

    // 1. Validate that the input is a valid image DataURI (JPG, PNG, WEBP, GIF)
    const mimeTypeMatch = base64Data.match(
      /^data:(image\/[a-zA-Z0-9.-]+);base64,/,
    );
    if (!mimeTypeMatch) {
      throw new InvalidImageFormatException();
    }

    const mimeType = mimeTypeMatch[1].toLowerCase();
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
      throw new InvalidImageFormatException();
    }

    try {
      const options = {
        folder: folder || 'general',
        resource_type: 'image' as const,
      };

      const result = await cloudinary.uploader.upload(base64Data, options);
      return result.secure_url;
    } catch (error) {
      this.logger.error(
        `Failed to upload image to Cloudinary`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ImageUploadFailedException();
    }
  }

  async deleteImage(url: string): Promise<void> {
    try {
      const publicId = this.extractPublicId(url);
      if (!publicId) {
        this.logger.warn(`Could not extract publicId from URL: ${url}`);
        return;
      }
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(
        `Failed to delete image from Cloudinary: ${url}`,
        error instanceof Error ? error.stack : undefined,
      );
      // We don't throw here. If image deletion fails, it shouldn't stop the main business logic.
    }
  }

  /**
   * Extracts the public ID from a Cloudinary URL.
   * Example: https://res.cloudinary.com/.../upload/v1612345678/folder/sample.jpg
   * Result: folder/sample
   */
  private extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/upload/');
      if (parts.length !== 2) return null;

      const afterUpload = parts[1];

      // Remove version (e.g. v123456/) if present
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');

      // Remove extension (e.g. .jpg, .png)
      const lastDotIndex = withoutVersion.lastIndexOf('.');
      if (lastDotIndex === -1) {
        return withoutVersion;
      }

      return withoutVersion.substring(0, lastDotIndex);
    } catch {
      return null;
    }
  }
}
