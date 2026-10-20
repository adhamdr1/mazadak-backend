"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var WithdrawalStatus;
(function (WithdrawalStatus) {
    WithdrawalStatus["PENDING"] = "PENDING";
    WithdrawalStatus["PROCESSING"] = "PROCESSING";
    WithdrawalStatus["COMPLETED"] = "COMPLETED";
    WithdrawalStatus["REJECTED"] = "REJECTED";
    WithdrawalStatus["CANCELLED"] = "CANCELLED";
})(WithdrawalStatus || (exports.WithdrawalStatus = WithdrawalStatus = {}));
(0, graphql_1.registerEnumType)(WithdrawalStatus, {
    name: 'WithdrawalStatus',
    description: 'Lifecycle status of a withdrawal request',
});
//# sourceMappingURL=withdrawal-status.enum.js.map