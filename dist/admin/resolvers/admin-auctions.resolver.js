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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuctionsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const auctions_service_1 = require("../../auctions/auctions.service");
const auctions_page_type_1 = require("../../auctions/dto/auctions-page.type");
const pagination_input_1 = require("../../common/dto/pagination.input");
const auctions_filter_input_1 = require("../../auctions/dto/auctions-filter.input");
let AdminAuctionsResolver = class AdminAuctionsResolver {
    auctionsService;
    constructor(auctionsService) {
        this.auctionsService = auctionsService;
    }
    async adminGetAuctions(input, filter) {
        return this.auctionsService.findAllForAdmin(input, filter || {});
    }
    async adminCancelAuction(auctionId, reason) {
        return this.auctionsService.adminCancelAuction(auctionId, reason);
    }
};
exports.AdminAuctionsResolver = AdminAuctionsResolver;
__decorate([
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AdminAuctionsResolver.prototype, "adminGetAuctions", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminAuctionsResolver.prototype, "adminCancelAuction", null);
exports.AdminAuctionsResolver = AdminAuctionsResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [auctions_service_1.AuctionsService])
], AdminAuctionsResolver);
//# sourceMappingURL=admin-auctions.resolver.js.map