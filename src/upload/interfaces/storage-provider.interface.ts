export interface IStorageProvider {
  uploadImage(base64Data: string, folder?: string): Promise<string>;
  deleteImage(url: string): Promise<void>;
}
