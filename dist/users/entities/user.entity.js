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
exports.UserSchema = exports.User = exports.Address = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_role_enum_1 = require("../enums/user-role.enum");
const auth_provider_enum_1 = require("../enums/auth-provider.enum");
const user_rating_stats_entity_1 = require("../../reviews/entities/user-rating-stats.entity");
let Address = class Address {
    city;
    street;
};
exports.Address = Address;
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Address.prototype, "street", void 0);
exports.Address = Address = __decorate([
    (0, mongoose_1.Schema)({ _id: false }),
    (0, graphql_1.ObjectType)()
], Address);
let User = class User {
    _id;
    firstName;
    lastName;
    email;
    authProvider;
    googleId;
    password;
    role;
    phoneNumber;
    dateOfBirth;
    address;
    isEmailVerified;
    isBanned;
    ratingStats;
    deletedAt;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], User.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true,
    }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, graphql_1.Field)(() => auth_provider_enum_1.AuthProvider),
    (0, mongoose_1.Prop)({ type: String, enum: auth_provider_enum_1.AuthProvider, default: auth_provider_enum_1.AuthProvider.LOCAL }),
    __metadata("design:type", String)
], User.prototype, "authProvider", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ default: null, index: true, sparse: true }),
    __metadata("design:type", String)
], User.prototype, "googleId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        select: false,
        required: function () {
            return this.authProvider === auth_provider_enum_1.AuthProvider.LOCAL;
        },
    }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, graphql_1.Field)(() => user_role_enum_1.UserRole),
    (0, mongoose_1.Prop)({ type: String, enum: user_role_enum_1.UserRole, default: user_role_enum_1.UserRole.USER }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], User.prototype, "dateOfBirth", void 0);
__decorate([
    (0, graphql_1.Field)(() => Address),
    (0, mongoose_1.Prop)({ type: Address, required: true }),
    __metadata("design:type", Address)
], User.prototype, "address", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isBanned", void 0);
__decorate([
    (0, graphql_1.Field)(() => user_rating_stats_entity_1.UserRatingStats, { nullable: true }),
    (0, mongoose_1.Prop)({ type: user_rating_stats_entity_1.UserRatingStatsSchema, default: () => ({}) }),
    __metadata("design:type", user_rating_stats_entity_1.UserRatingStats)
], User.prototype, "ratingStats", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ default: null, index: true, sparse: true }),
    __metadata("design:type", Date)
], User.prototype, "deletedAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
    })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
exports.UserSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
exports.UserSchema.index({ role: 1, isBanned: 1, isEmailVerified: 1, createdAt: -1 });
exports.UserSchema.index({ firstName: 1 });
exports.UserSchema.index({ lastName: 1 });
//# sourceMappingURL=user.entity.js.map