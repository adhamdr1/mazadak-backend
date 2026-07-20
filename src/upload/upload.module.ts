import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadResolver } from './upload.resolver';
import { CloudinaryProvider } from './providers/cloudinary.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    UploadResolver,
    UploadService,
    {
      provide: 'IStorageProvider',
      useClass: CloudinaryProvider,
    },
  ],
  exports: [UploadService], // Exporting so AuctionModule can use deleteImage later
})
export class UploadModule {}
