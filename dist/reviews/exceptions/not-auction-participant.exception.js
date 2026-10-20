"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotAuctionParticipantException = void 0;
const common_1 = require("@nestjs/common");
class NotAuctionParticipantException extends common_1.ForbiddenException {
    constructor(message = 'NOT_AUCTION_PARTICIPANT') {
        super(message);
    }
}
exports.NotAuctionParticipantException = NotAuctionParticipantException;
//# sourceMappingURL=not-auction-participant.exception.js.map