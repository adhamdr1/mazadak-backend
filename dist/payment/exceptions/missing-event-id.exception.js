"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingEventIdException = void 0;
const common_1 = require("@nestjs/common");
class MissingEventIdException extends common_1.BadRequestException {
    constructor() {
        super('Missing event id in payload', 'MISSING_EVENT_ID');
    }
}
exports.MissingEventIdException = MissingEventIdException;
//# sourceMappingURL=missing-event-id.exception.js.map