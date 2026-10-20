import type { IStorageProvider, UploadSignature } from './interfaces/storage-provider.interface';
export declare class UploadService {
    private readonly storageProvider;
    constructor(storageProvider: IStorageProvider);
    uploadImage(userId: string, base64Data: string, folderName?: string): Promise<string>;
    deleteImage(userId: string, url: string): Promise<void>;
    generateUploadSignature(userId: string, folderName?: string): Promise<UploadSignature>;
}
