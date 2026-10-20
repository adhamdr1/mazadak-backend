"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidAuctionIdException = void 0;
const common_1 = require("@nestjs/common");
class InvalidAuctionIdException extends common_1.BadRequestException {
    constructor() {
        super('Invalid auction ID format');
    }
}
exports.InvalidAuctionIdException = InvalidAuctionIdException;
//# sourceMappingURL=invalid-auction-id.exception.js.map