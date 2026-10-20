"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserPublicProfileQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
class GetUserPublicProfileQuery extends cqrs_1.Query {
    userId;
    constructor(userId) {
        super();
        this.userId = userId;
    }
}
exports.GetUserPublicProfileQuery = GetUserPublicProfileQuery;
//# sourceMappingURL=get-user-public-profile.query.js.map