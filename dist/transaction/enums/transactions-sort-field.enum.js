"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsSortField = void 0;
const graphql_1 = require("@nestjs/graphql");
var TransactionsSortField;
(function (TransactionsSortField) {
    TransactionsSortField["CREATED_AT"] = "createdAt";
    TransactionsSortField["AMOUNT"] = "amount";
})(TransactionsSortField || (exports.TransactionsSortField = TransactionsSortField = {}));
(0, graphql_1.registerEnumType)(TransactionsSortField, {
    name: 'TransactionsSortField',
    description: 'Fields by which transactions can be sorted',
});
//# sourceMappingURL=transactions-sort-field.enum.js.map