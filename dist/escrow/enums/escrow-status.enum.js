"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var EscrowStatus;
(function (EscrowStatus) {
    EscrowStatus["HELD"] = "HELD";
    EscrowStatus["RELEASED"] = "RELEASED";
    EscrowStatus["REFUNDED"] = "REFUNDED";
    EscrowStatus["DISPUTED"] = "DISPUTED";
})(EscrowStatus || (exports.EscrowStatus = EscrowStatus = {}));
(0, graphql_1.registerEnumType)(EscrowStatus, {
    name: 'EscrowStatus',
    description: 'Lifecycle status of an escrow hold',
});
//# sourceMappingURL=escrow-status.enum.js.map