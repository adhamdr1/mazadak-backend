import { ConfigService } from '@nestjs/config';
import { IStorageProvider, UploadSignature } from '../interfaces/storage-provider.interface';
export declare class CloudinaryProvider implements IStorageProvider {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    uploadImage(base64Data: string, folder?: string): Promise<string>;
    deleteImage(url: string): Promise<void>;
    private extractPublicId;
    generateUploadSignature(folder?: string): Promise<UploadSignature>;
}
