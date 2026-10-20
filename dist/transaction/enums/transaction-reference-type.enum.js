"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionReferenceType = void 0;
const graphql_1 = require("@nestjs/graphql");
var TransactionReferenceType;
(function (TransactionReferenceType) {
    TransactionReferenceType["AUCTION"] = "AUCTION";
    TransactionReferenceType["TRANSACTION"] = "TRANSACTION";
    TransactionReferenceType["ESCROW"] = "ESCROW";
    TransactionReferenceType["DISPUTE"] = "DISPUTE";
    TransactionReferenceType["WITHDRAWAL"] = "WITHDRAWAL";
})(TransactionReferenceType || (exports.TransactionReferenceType = TransactionReferenceType = {}));
(0, graphql_1.registerEnumType)(TransactionReferenceType, {
    name: 'TransactionReferenceType',
});
//# sourceMappingURL=transaction-reference-type.enum.js.map