"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProviderType = void 0;
const graphql_1 = require("@nestjs/graphql");
var PaymentProviderType;
(function (PaymentProviderType) {
    PaymentProviderType["STRIPE"] = "STRIPE";
    PaymentProviderType["PAYMOB"] = "PAYMOB";
})(PaymentProviderType || (exports.PaymentProviderType = PaymentProviderType = {}));
(0, graphql_1.registerEnumType)(PaymentProviderType, {
    name: 'PaymentProviderType',
    description: 'Supported payment providers',
});
//# sourceMappingURL=payment-provider-type.enum.js.map