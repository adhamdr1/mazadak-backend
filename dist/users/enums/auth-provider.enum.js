"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = void 0;
const graphql_1 = require("@nestjs/graphql");
var AuthProvider;
(function (AuthProvider) {
    AuthProvider["LOCAL"] = "LOCAL";
    AuthProvider["GOOGLE"] = "GOOGLE";
})(AuthProvider || (exports.AuthProvider = AuthProvider = {}));
(0, graphql_1.registerEnumType)(AuthProvider, { name: 'AuthProvider' });
//# sourceMappingURL=auth-provider.enum.js.map