"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeReason = void 0;
const graphql_1 = require("@nestjs/graphql");
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["ITEM_NOT_RECEIVED"] = "ITEM_NOT_RECEIVED";
    DisputeReason["ITEM_DAMAGED"] = "ITEM_DAMAGED";
    DisputeReason["ITEM_MISMATCH"] = "ITEM_MISMATCH";
    DisputeReason["COUNTERFEIT_ITEM"] = "COUNTERFEIT_ITEM";
    DisputeReason["OTHER"] = "OTHER";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
(0, graphql_1.registerEnumType)(DisputeReason, {
    name: 'DisputeReason',
    description: 'Reason for opening a dispute against an escrow transaction',
});
//# sourceMappingURL=dispute-reason.enum.js.map