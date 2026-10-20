"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CloudinaryProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const image_upload_failed_exception_1 = require("../exceptions/image-upload-failed.exception");
const invalid_image_format_exception_1 = require("../exceptions/invalid-image-format.exception");
const image_too_large_exception_1 = require("../exceptions/image-too-large.exception");
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
];
const MAX_BASE64_LENGTH = 7000000;
let CloudinaryProvider = CloudinaryProvider_1 = class CloudinaryProvider {
    configService;
    logger = new common_1.Logger(CloudinaryProvider_1.name);
    constructor(configService) {
        this.configService = configService;
        cloudinary_1.v2.config({
            cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
            api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
        });
    }
    async uploadImage(base64Data, folder) {
        if (base64Data.length > MAX_BASE64_LENGTH) {
            throw new image_too_large_exception_1.ImageTooLargeException();
        }
        const mimeTypeMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,/);
        if (!mimeTypeMatch) {
            throw new invalid_image_format_exception_1.InvalidImageFormatException();
        }
        const mimeType = mimeTypeMatch[1].toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
            throw new invalid_image_format_exception_1.InvalidImageFormatException();
        }
        try {
            const options = {
                folder: folder || 'general',
                resource_type: 'image',
            };
            const result = await cloudinary_1.v2.uploader.upload(base64Data, options);
            return result.secure_url;
        }
        catch (error) {
            this.logger.error(`Failed to upload image to Cloudinary`, error instanceof Error ? error.stack : undefined);
            throw new image_upload_failed_exception_1.ImageUploadFailedException();
        }
    }
    async deleteImage(url) {
        try {
            const publicId = this.extractPublicId(url);
            if (!publicId) {
                this.logger.warn(`Could not extract publicId from URL: ${url}`);
                return;
            }
            await cloudinary_1.v2.uploader.destroy(publicId);
        }
        catch (error) {
            this.logger.error(`Failed to delete image from Cloudinary: ${url}`, error instanceof Error ? error.stack : undefined);
        }
    }
    extractPublicId(url) {
        try {
            const parts = url.split('/upload/');
            if (parts.length !== 2)
                return null;
            const afterUpload = parts[1];
            const withoutVersion = afterUpload.replace(/^v\d+\//, '');
            const lastDotIndex = withoutVersion.lastIndexOf('.');
            if (lastDotIndex === -1) {
                return withoutVersion;
            }
            return withoutVersion.substring(0, lastDotIndex);
        }
        catch {
            return null;
        }
    }
    generateUploadSignature(folder = 'general') {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const apiSecret = this.configService.getOrThrow('CLOUDINARY_API_SECRET');
        const signature = cloudinary_1.v2.utils.api_sign_request({
            timestamp,
            folder,
        }, apiSecret);
        return Promise.resolve({
            signature,
            timestamp,
            apiKey: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
            cloudName: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
            folder,
        });
    }
};
exports.CloudinaryProvider = CloudinaryProvider;
exports.CloudinaryProvider = CloudinaryProvider = CloudinaryProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryProvider);
//# sourceMappingURL=cloudinary.provider.js.map