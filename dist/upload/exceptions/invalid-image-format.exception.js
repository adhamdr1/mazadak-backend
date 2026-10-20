"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidImageFormatException = void 0;
const common_1 = require("@nestjs/common");
class InvalidImageFormatException extends common_1.BadRequestException {
    constructor() {
        super('INVALID_IMAGE_FORMAT');
    }
}
exports.InvalidImageFormatException = InvalidImageFormatException;
//# sourceMappingURL=invalid-image-format.exception.js.map