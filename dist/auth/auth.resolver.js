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
exports.AuthResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const auth_service_1 = require("./auth.service");
const register_input_1 = require("./dto/register.input");
const auth_response_1 = require("./dto/auth.response");
const register_response_1 = require("./dto/register.response");
const public_decorator_1 = require("../common/decorators/public.decorator");
const login_input_1 = require("./dto/login.input");
const google_login_input_1 = require("./dto/google-login.input");
const google_register_input_1 = require("./dto/google-register.input");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const throttler_1 = require("@nestjs/throttler");
const forgot_password_input_1 = require("./dto/forgot-password.input");
const reset_password_input_1 = require("./dto/reset-password.input");
const update_password_input_1 = require("./dto/update-password.input");
let AuthResolver = class AuthResolver {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerInput) {
        return this.authService.register(registerInput);
    }
    async login(loginInput) {
        return this.authService.login(loginInput);
    }
    async googleRegister(input) {
        return this.authService.googleRegister(input);
    }
    async googleLogin(googleLoginInput) {
        return this.authService.googleLogin(googleLoginInput);
    }
    async confirmEmail(token) {
        return this.authService.confirmEmail(token);
    }
    async resendConfirmationEmail(email) {
        return this.authService.resendConfirmationEmail(email);
    }
    async requestReactivation(email) {
        return this.authService.requestReactivation(email);
    }
    async confirmReactivation(token) {
        return this.authService.confirmReactivation(token);
    }
    async refreshToken(refreshToken) {
        return this.authService.refreshTokens(refreshToken);
    }
    async logout(refreshToken) {
        return this.authService.logout(refreshToken);
    }
    async logoutAll(user) {
        return this.authService.logoutAll(user.sub);
    }
    async forgotPassword(input, context) {
        const req = context.req;
        const ip = req.ip ?? req.socket?.remoteAddress ?? 'Unknown IP';
        const browser = req.headers['user-agent'] ?? 'Unknown Browser';
        return this.authService.forgotPassword(input, ip, browser);
    }
    async resetPassword(input) {
        return this.authService.resetPassword(input);
    }
    async updatePassword(user, input) {
        return this.authService.updatePassword(user.sub, input);
    }
};
exports.AuthResolver = AuthResolver;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => register_response_1.RegisterResponse, { name: 'register' }),
    __param(0, (0, graphql_1.Args)('registerInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_input_1.RegisterInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => auth_response_1.AuthResponse, { name: 'login' }),
    __param(0, (0, graphql_1.Args)('loginInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_input_1.LoginInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => auth_response_1.AuthResponse, { name: 'googleRegister' }),
    __param(0, (0, graphql_1.Args)('googleRegisterInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_register_input_1.GoogleRegisterInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "googleRegister", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => auth_response_1.AuthResponse, { name: 'googleLogin' }),
    __param(0, (0, graphql_1.Args)('googleLoginInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_login_input_1.GoogleLoginInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "googleLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'confirmEmail' }),
    __param(0, (0, graphql_1.Args)('token', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "confirmEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'resendConfirmationEmail' }),
    __param(0, (0, graphql_1.Args)('email', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "resendConfirmationEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'requestReactivation' }),
    __param(0, (0, graphql_1.Args)('email', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "requestReactivation", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'confirmReactivation' }),
    __param(0, (0, graphql_1.Args)('token', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "confirmReactivation", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => auth_response_1.AuthResponse, { name: 'refreshToken' }),
    __param(0, (0, graphql_1.Args)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "refreshToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'logout' }),
    __param(0, (0, graphql_1.Args)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "logout", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'logoutAll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "logoutAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'forgotPassword' }),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_input_1.ForgotPasswordInput, Object]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60_000, limit: 5 } }),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'resetPassword' }),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_input_1.ResetPasswordInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "resetPassword", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'updatePassword' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_password_input_1.UpdatePasswordInput]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "updatePassword", null);
exports.AuthResolver = AuthResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthResolver);
//# sourceMappingURL=auth.resolver.js.map