"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSortInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const users_sort_field_enum_1 = require("../enums/users-sort-field.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let UsersSortInput = class UsersSortInput {
    field = users_sort_field_enum_1.UsersSortField.CREATED_AT;
    order = sort_order_enum_1.SortOrder.DESC;
};
exports.UsersSortInput = UsersSortInput;
__decorate([
    (0, graphql_1.Field)(() => users_sort_field_enum_1.UsersSortField, { defaultValue: users_sort_field_enum_1.UsersSortField.CREATED_AT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(users_sort_field_enum_1.UsersSortField),
    __metadata("design:type", String)
], UsersSortInput.prototype, "field", void 0);
__decorate([
    (0, graphql_1.Field)(() => sort_order_enum_1.SortOrder, { defaultValue: sort_order_enum_1.SortOrder.DESC }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(sort_order_enum_1.SortOrder),
    __metadata("design:type", String)
], UsersSortInput.prototype, "order", void 0);
exports.UsersSortInput = UsersSortInput = __decorate([
    (0, graphql_1.InputType)()
], UsersSortInput);
//# sourceMappingURL=users-sort.input.js.map