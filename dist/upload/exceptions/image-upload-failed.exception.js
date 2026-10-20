"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageUploadFailedException = void 0;
const common_1 = require("@nestjs/common");
class ImageUploadFailedException extends common_1.InternalServerErrorException {
    constructor(message) {
        super(message || 'IMAGE_UPLOAD_FAILED');
    }
}
exports.ImageUploadFailedException = ImageUploadFailedException;
//# sourceMappingURL=image-upload-failed.exception.js.map