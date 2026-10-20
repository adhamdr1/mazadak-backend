"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamePasswordException = void 0;
const common_1 = require("@nestjs/common");
class SamePasswordException extends common_1.BadRequestException {
    constructor() {
        super('SAME_PASSWORD');
    }
}
exports.SamePasswordException = SamePasswordException;
//# sourceMappingURL=same-password.exception.js.map