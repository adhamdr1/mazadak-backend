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
exports.ReviewsSortInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const reviews_sort_field_enum_1 = require("../enums/reviews-sort-field.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let ReviewsSortInput = class ReviewsSortInput {
    field = reviews_sort_field_enum_1.ReviewsSortField.CREATED_AT;
    order = sort_order_enum_1.SortOrder.DESC;
};
exports.ReviewsSortInput = ReviewsSortInput;
__decorate([
    (0, graphql_1.Field)(() => reviews_sort_field_enum_1.ReviewsSortField, {
        defaultValue: reviews_sort_field_enum_1.ReviewsSortField.CREATED_AT,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(reviews_sort_field_enum_1.ReviewsSortField),
    __metadata("design:type", String)
], ReviewsSortInput.prototype, "field", void 0);
__decorate([
    (0, graphql_1.Field)(() => sort_order_enum_1.SortOrder, {
        defaultValue: sort_order_enum_1.SortOrder.DESC,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(sort_order_enum_1.SortOrder),
    __metadata("design:type", String)
], ReviewsSortInput.prototype, "order", void 0);
exports.ReviewsSortInput = ReviewsSortInput = __decorate([
    (0, graphql_1.InputType)()
], ReviewsSortInput);
//# sourceMappingURL=reviews-sort.input.js.map