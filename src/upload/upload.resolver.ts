import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadImageInput } from './dto/upload-image.input';
import { UploadImageResponse } from './dto/upload-image.response';
import { UploadSignatureResponse } from './dto/upload-signature.response';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Resolver()
export class UploadResolver {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => UploadImageResponse, { name: 'uploadImage' })
  async uploadImage(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: UploadImageInput,
  ): Promise<UploadImageResponse> {
    const url = await this.uploadService.uploadImage(
      user.sub,
      input.base64Data,
      input.folder,
    );

    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { name: 'deleteImage' })
  async deleteImage(
    @CurrentUser() user: JwtPayload,
    @Args('url') url: string,
  ): Promise<boolean> {
    await this.uploadService.deleteImage(user.sub, url);
    return true;
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => UploadSignatureResponse, { name: 'generateUploadSignature' })
  generateUploadSignature(
    @CurrentUser() user: JwtPayload,
    @Args('folder', { nullable: true }) folder?: string,
  ): Promise<UploadSignatureResponse> {
    return this.uploadService.generateUploadSignature(user.sub, folder);
  }
}
