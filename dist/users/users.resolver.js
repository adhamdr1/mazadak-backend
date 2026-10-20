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
exports.UsersResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const user_entity_1 = require("./entities/user.entity");
const user_role_enum_1 = require("./enums/user-role.enum");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const find_user_input_1 = require("./dto/find-user.input");
const pagination_input_1 = require("../common/dto/pagination.input");
const update_user_input_1 = require("./dto/update-user.input");
const users_page_type_1 = require("./dto/users-page.type");
const users_filter_input_1 = require("./dto/users-filter.input");
const public_profile_dto_1 = require("./dto/public-profile.dto");
let UsersResolver = class UsersResolver {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getPublicProfile(userId) {
        return this.usersService.getPublicProfile(userId);
    }
    async me(currentUser) {
        return this.usersService.findById(currentUser.sub);
    }
    async findUser(input) {
        return this.usersService.findById(input.id);
    }
    async findAll(input, filter) {
        return this.usersService.findAll(input, filter);
    }
    async updateProfile(currentUser, input) {
        return this.usersService.updateProfile(currentUser, currentUser.sub, input);
    }
    async deleteAccount(currentUser) {
        await this.usersService.softDeleteUser(currentUser.sub, currentUser);
        return true;
    }
    async adminUpdateUser(currentUser, targetUser, input) {
        return this.usersService.updateProfile(currentUser, targetUser.id, input);
    }
    async adminDeleteUser(currentUser, targetUser) {
        await this.usersService.softDeleteUser(targetUser.id, currentUser);
        return true;
    }
};
exports.UsersResolver = UsersResolver;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => public_profile_dto_1.PublicProfile, { name: 'publicProfile' }),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "getPublicProfile", null);
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User, { name: 'me' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "me", null);
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User, { name: 'findUser' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [find_user_input_1.FindUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "findUser", null);
__decorate([
    (0, graphql_1.Query)(() => users_page_type_1.UsersPage, { name: 'users' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        users_filter_input_1.UsersFilterInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "findAll", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User, { name: 'updateProfile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_input_1.UpdateUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "updateProfile", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'deleteAccount' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "deleteAccount", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User, { name: 'adminUpdateUser' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('targetUser')),
    __param(2, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, find_user_input_1.FindUserInput,
        update_user_input_1.UpdateUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "adminUpdateUser", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'adminDeleteUser' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('targetUser')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, find_user_input_1.FindUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "adminDeleteUser", null);
exports.UsersResolver = UsersResolver = __decorate([
    (0, graphql_1.Resolver)(() => user_entity_1.User),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersResolver);
//# sourceMappingURL=users.resolver.js.map