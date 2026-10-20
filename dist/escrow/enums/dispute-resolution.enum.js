"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeResolution = void 0;
const graphql_1 = require("@nestjs/graphql");
var DisputeResolution;
(function (DisputeResolution) {
    DisputeResolution["REFUND_BUYER"] = "REFUND_BUYER";
    DisputeResolution["PAY_SELLER"] = "PAY_SELLER";
})(DisputeResolution || (exports.DisputeResolution = DisputeResolution = {}));
(0, graphql_1.registerEnumType)(DisputeResolution, {
    name: 'DisputeResolution',
    description: 'Admin resolution decision for an escrow dispute',
});
//# sourceMappingURL=dispute-resolution.enum.js.map