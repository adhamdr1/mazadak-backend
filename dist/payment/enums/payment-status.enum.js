"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["PENDING"] = "PENDING";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
(0, graphql_1.registerEnumType)(PaymentStatus, {
    name: 'PaymentStatus',
    description: 'Status of the payment intent from the gateway provider',
});
//# sourceMappingURL=payment-status.enum.js.map