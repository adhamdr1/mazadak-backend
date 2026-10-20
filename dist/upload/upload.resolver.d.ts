import { UploadService } from './upload.service';
import { UploadImageInput } from './dto/upload-image.input';
import { UploadImageResponse } from './dto/upload-image.response';
import { UploadSignatureResponse } from './dto/upload-signature.response';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
export declare class UploadResolver {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadImage(user: JwtPayload, input: UploadImageInput): Promise<UploadImageResponse>;
    deleteImage(user: JwtPayload, url: string): Promise<boolean>;
    generateUploadSignature(user: JwtPayload, folder?: string): Promise<UploadSignatureResponse>;
}
