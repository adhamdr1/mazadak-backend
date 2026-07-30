export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface IStorageProvider {
  uploadImage(base64Data: string, folder?: string): Promise<string>;
  deleteImage(url: string): Promise<void>;
  generateUploadSignature(folder?: string): Promise<UploadSignature>;
}
