"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["PROCESSING"] = "PROCESSING";
    TransactionStatus["SUCCESS"] = "SUCCESS";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
    TransactionStatus["EXPIRED"] = "EXPIRED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
(0, graphql_1.registerEnumType)(TransactionStatus, {
    name: 'TransactionStatus',
});
//# sourceMappingURL=transaction-status.enum.js.map