"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutMethod = void 0;
const graphql_1 = require("@nestjs/graphql");
var PayoutMethod;
(function (PayoutMethod) {
    PayoutMethod["VODAFONE_CASH"] = "VODAFONE_CASH";
    PayoutMethod["ORANGE_CASH"] = "ORANGE_CASH";
    PayoutMethod["ETISALAT_CASH"] = "ETISALAT_CASH";
    PayoutMethod["WE_PAY"] = "WE_PAY";
    PayoutMethod["INSTAPAY"] = "INSTAPAY";
    PayoutMethod["BANK_ACCOUNT"] = "BANK_ACCOUNT";
})(PayoutMethod || (exports.PayoutMethod = PayoutMethod = {}));
(0, graphql_1.registerEnumType)(PayoutMethod, {
    name: 'PayoutMethod',
    description: 'Payout destination methods supported by Mazadak',
});
//# sourceMappingURL=payout-method.enum.js.map