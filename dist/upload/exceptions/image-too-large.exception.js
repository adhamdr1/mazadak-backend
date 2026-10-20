"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageTooLargeException = void 0;
const common_1 = require("@nestjs/common");
class ImageTooLargeException extends common_1.BadRequestException {
    constructor() {
        super('Image size exceeds 5MB limit');
    }
}
exports.ImageTooLargeException = ImageTooLargeException;
//# sourceMappingURL=image-too-large.exception.js.map