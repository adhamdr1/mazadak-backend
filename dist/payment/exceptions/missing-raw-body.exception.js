"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingRawBodyException = void 0;
const common_1 = require("@nestjs/common");
class MissingRawBodyException extends common_1.BadRequestException {
    constructor() {
        super('Missing raw body', 'MISSING_RAW_BODY');
    }
}
exports.MissingRawBodyException = MissingRawBodyException;
//# sourceMappingURL=missing-raw-body.exception.js.map