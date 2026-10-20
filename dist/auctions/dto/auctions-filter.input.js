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
exports.AuctionsFilterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const auction_category_enum_1 = require("../enums/auction-category.enum");
const auction_status_enum_1 = require("../enums/auction-status.enum");
const auctions_sort_input_1 = require("./auctions-sort.input");
const class_transformer_1 = require("class-transformer");
const is_after_decorator_1 = require("../../common/decorators/is-after.decorator");
let AuctionsFilterInput = class AuctionsFilterInput {
    category;
    status;
    search;
    sort;
    startDate;
    endDate;
};
exports.AuctionsFilterInput = AuctionsFilterInput;
__decorate([
    (0, graphql_1.Field)(() => auction_category_enum_1.AuctionCategory, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(auction_category_enum_1.AuctionCategory, { message: 'Invalid auction category' }),
    __metadata("design:type", String)
], AuctionsFilterInput.prototype, "category", void 0);
__decorate([
    (0, graphql_1.Field)(() => auction_status_enum_1.AuctionStatus, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(auction_status_enum_1.AuctionStatus, { message: 'Invalid auction status' }),
    __metadata("design:type", String)
], AuctionsFilterInput.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Search term must not exceed 100 characters' }),
    __metadata("design:type", String)
], AuctionsFilterInput.prototype, "search", void 0);
__decorate([
    (0, graphql_1.Field)(() => auctions_sort_input_1.AuctionsSortInput, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => auctions_sort_input_1.AuctionsSortInput),
    __metadata("design:type", auctions_sort_input_1.AuctionsSortInput)
], AuctionsFilterInput.prototype, "sort", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], AuctionsFilterInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, is_after_decorator_1.IsAfter)('startDate'),
    __metadata("design:type", Date)
], AuctionsFilterInput.prototype, "endDate", void 0);
exports.AuctionsFilterInput = AuctionsFilterInput = __decorate([
    (0, graphql_1.InputType)()
], AuctionsFilterInput);
//# sourceMappingURL=auctions-filter.input.js.map