"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserRatingStatsQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
class GetUserRatingStatsQuery extends cqrs_1.Query {
    userId;
    constructor(userId) {
        super();
        this.userId = userId;
    }
}
exports.GetUserRatingStatsQuery = GetUserRatingStatsQuery;
//# sourceMappingURL=get-user-rating-stats.query.js.map