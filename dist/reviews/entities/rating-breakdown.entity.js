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
exports.RatingBreakdownSchema = exports.RatingBreakdown = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
let RatingBreakdown = class RatingBreakdown {
    oneStar;
    twoStar;
    threeStar;
    fourStar;
    fiveStar;
};
exports.RatingBreakdown = RatingBreakdown;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], RatingBreakdown.prototype, "oneStar", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], RatingBreakdown.prototype, "twoStar", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], RatingBreakdown.prototype, "threeStar", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], RatingBreakdown.prototype, "fourStar", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], RatingBreakdown.prototype, "fiveStar", void 0);
exports.RatingBreakdown = RatingBreakdown = __decorate([
    (0, mongoose_1.Schema)({ _id: false }),
    (0, graphql_1.ObjectType)()
], RatingBreakdown);
exports.RatingBreakdownSchema = mongoose_1.SchemaFactory.createForClass(RatingBreakdown);
//# sourceMappingURL=rating-breakdown.entity.js.map