"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSortField = void 0;
const graphql_1 = require("@nestjs/graphql");
var UsersSortField;
(function (UsersSortField) {
    UsersSortField["CREATED_AT"] = "createdAt";
    UsersSortField["FIRST_NAME"] = "firstName";
    UsersSortField["LAST_NAME"] = "lastName";
})(UsersSortField || (exports.UsersSortField = UsersSortField = {}));
(0, graphql_1.registerEnumType)(UsersSortField, {
    name: 'UsersSortField',
    description: 'Fields by which users can be sorted',
});
//# sourceMappingURL=users-sort-field.enum.js.map