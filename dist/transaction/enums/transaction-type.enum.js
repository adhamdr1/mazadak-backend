"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionType = void 0;
const graphql_1 = require("@nestjs/graphql");
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAW"] = "WITHDRAW";
    TransactionType["HOLD"] = "HOLD";
    TransactionType["RELEASE"] = "RELEASE";
    TransactionType["CAPTURE"] = "CAPTURE";
    TransactionType["REFUND"] = "REFUND";
    TransactionType["ADMIN_CREDIT"] = "ADMIN_CREDIT";
    TransactionType["ADMIN_DEBIT"] = "ADMIN_DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
(0, graphql_1.registerEnumType)(TransactionType, {
    name: 'TransactionType',
});
//# sourceMappingURL=transaction-type.enum.js.map