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
exports.CreateAuctionInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const string_transformer_1 = require("../../common/transformers/string.transformer");
const auction_category_enum_1 = require("../enums/auction-category.enum");
let CreateAuctionInput = class CreateAuctionInput {
    title;
    description;
    category;
    startingPrice;
    minimumBidIncrement;
    images;
    startTime;
    endTime;
};
exports.CreateAuctionInput = CreateAuctionInput;
__decorate([
    (0, graphql_1.Field)(),
    (0, class_transformer_1.Transform)(string_transformer_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    (0, class_validator_1.MinLength)(3, { message: 'Title must be at least 3 characters long' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Title must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateAuctionInput.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_transformer_1.Transform)(string_transformer_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Description is required' }),
    (0, class_validator_1.MinLength)(10, { message: 'Description must be at least 10 characters long' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'Description must not exceed 2000 characters' }),
    __metadata("design:type", String)
], CreateAuctionInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => auction_category_enum_1.AuctionCategory),
    (0, class_validator_1.IsEnum)(auction_category_enum_1.AuctionCategory, { message: 'Invalid auction category' }),
    __metadata("design:type", String)
], CreateAuctionInput.prototype, "category", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsNumber)({}, { message: 'Starting price must be a number' }),
    (0, class_validator_1.Min)(1, { message: 'Starting price must be at least 1' }),
    __metadata("design:type", Number)
], CreateAuctionInput.prototype, "startingPrice", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsNumber)({}, { message: 'Minimum bid increment must be a number' }),
    (0, class_validator_1.Min)(1, { message: 'Minimum bid increment must be at least 1' }),
    __metadata("design:type", Number)
], CreateAuctionInput.prototype, "minimumBidIncrement", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String]),
    (0, class_validator_1.IsArray)({ message: 'Images must be an array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one image is required' }),
    (0, class_validator_1.ArrayMaxSize)(10, { message: 'Maximum 10 images allowed' }),
    (0, class_validator_1.IsUrl)({}, { each: true, message: 'Each image must be a valid URL' }),
    __metadata("design:type", Array)
], CreateAuctionInput.prototype, "images", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.GraphQLISODateTime),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)({ message: 'Invalid start time format' }),
    __metadata("design:type", Date)
], CreateAuctionInput.prototype, "startTime", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.GraphQLISODateTime),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)({ message: 'Invalid end time format' }),
    __metadata("design:type", Date)
], CreateAuctionInput.prototype, "endTime", void 0);
exports.CreateAuctionInput = CreateAuctionInput = __decorate([
    (0, graphql_1.InputType)()
], CreateAuctionInput);
//# sourceMappingURL=create-auction.input.js.map