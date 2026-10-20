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
exports.AdminUserDetails = void 0;
const graphql_1 = require("@nestjs/graphql");
const user_entity_1 = require("../../users/entities/user.entity");
const wallet_entity_1 = require("../../wallet/entities/wallet.entity");
const auctions_page_type_1 = require("../../auctions/dto/auctions-page.type");
const transactions_page_type_1 = require("../../transaction/dto/transactions-page.type");
let AdminUserDetails = class AdminUserDetails {
    user;
    wallet;
    recentAuctions;
    recentTransactions;
};
exports.AdminUserDetails = AdminUserDetails;
__decorate([
    (0, graphql_1.Field)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], AdminUserDetails.prototype, "user", void 0);
__decorate([
    (0, graphql_1.Field)(() => wallet_entity_1.Wallet, { nullable: true }),
    __metadata("design:type", wallet_entity_1.Wallet)
], AdminUserDetails.prototype, "wallet", void 0);
__decorate([
    (0, graphql_1.Field)(() => auctions_page_type_1.AuctionsPage, { nullable: true }),
    __metadata("design:type", auctions_page_type_1.AuctionsPage)
], AdminUserDetails.prototype, "recentAuctions", void 0);
__decorate([
    (0, graphql_1.Field)(() => transactions_page_type_1.TransactionsPage, { nullable: true }),
    __metadata("design:type", transactions_page_type_1.TransactionsPage)
], AdminUserDetails.prototype, "recentTransactions", void 0);
exports.AdminUserDetails = AdminUserDetails = __decorate([
    (0, graphql_1.ObjectType)()
], AdminUserDetails);
//# sourceMappingURL=admin-user-details.dto.js.map