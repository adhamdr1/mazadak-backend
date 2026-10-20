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
exports.UsersFilterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const users_sort_input_1 = require("./users-sort.input");
const user_role_enum_1 = require("../enums/user-role.enum");
const is_after_decorator_1 = require("../../common/decorators/is-after.decorator");
let UsersFilterInput = class UsersFilterInput {
    search;
    sort;
    isBanned;
    role;
    isEmailVerified;
    startDate;
    endDate;
};
exports.UsersFilterInput = UsersFilterInput;
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UsersFilterInput.prototype, "search", void 0);
__decorate([
    (0, graphql_1.Field)(() => users_sort_input_1.UsersSortInput, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => users_sort_input_1.UsersSortInput),
    __metadata("design:type", users_sort_input_1.UsersSortInput)
], UsersFilterInput.prototype, "sort", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UsersFilterInput.prototype, "isBanned", void 0);
__decorate([
    (0, graphql_1.Field)(() => user_role_enum_1.UserRole, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_role_enum_1.UserRole),
    __metadata("design:type", String)
], UsersFilterInput.prototype, "role", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UsersFilterInput.prototype, "isEmailVerified", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], UsersFilterInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, is_after_decorator_1.IsAfter)('startDate'),
    __metadata("design:type", Date)
], UsersFilterInput.prototype, "endDate", void 0);
exports.UsersFilterInput = UsersFilterInput = __decorate([
    (0, graphql_1.InputType)()
], UsersFilterInput);
//# sourceMappingURL=users-filter.input.js.map