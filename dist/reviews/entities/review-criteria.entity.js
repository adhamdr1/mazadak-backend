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
exports.ReviewCriteriaSchema = exports.ReviewCriteria = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
let ReviewCriteria = class ReviewCriteria {
    itemAccuracy;
    communication;
    packaging;
    smoothExperience;
};
exports.ReviewCriteria = ReviewCriteria;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 5, required: false }),
    __metadata("design:type", Number)
], ReviewCriteria.prototype, "itemAccuracy", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 5, required: false }),
    __metadata("design:type", Number)
], ReviewCriteria.prototype, "communication", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 5, required: false }),
    __metadata("design:type", Number)
], ReviewCriteria.prototype, "packaging", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 5, required: false }),
    __metadata("design:type", Number)
], ReviewCriteria.prototype, "smoothExperience", void 0);
exports.ReviewCriteria = ReviewCriteria = __decorate([
    (0, mongoose_1.Schema)({ _id: false }),
    (0, graphql_1.ObjectType)()
], ReviewCriteria);
exports.ReviewCriteriaSchema = mongoose_1.SchemaFactory.createForClass(ReviewCriteria);
//# sourceMappingURL=review-criteria.entity.js.map