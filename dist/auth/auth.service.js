"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const email_already_exists_exception_1 = require("../users/exceptions/email-already-exists.exception");
const email_already_verified_exception_1 = require("../users/exceptions/email-already-verified.exception");
const user_not_found_exception_1 = require("../users/exceptions/user-not-found.exception");
const invalid_credentials_exception_1 = require("./exceptions/invalid-credentials.exception");
const email_not_verified_exception_1 = require("./exceptions/email-not-verified.exception");
const invalid_token_exception_1 = require("./exceptions/invalid-token.exception");
const account_disabled_exception_1 = require("./exceptions/account-disabled.exception");
const account_soft_deleted_exception_1 = require("./exceptions/account-soft-deleted.exception");
const account_banned_exception_1 = require("./exceptions/account-banned.exception");
const google_account_no_password_exception_1 = require("./exceptions/google-account-no-password.exception");
const same_password_exception_1 = require("./exceptions/same-password.exception");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
const crypto_1 = require("crypto");
const google_auth_library_1 = require("google-auth-library");
const registration_required_exception_1 = require("./exceptions/registration-required.exception");
const auth_provider_enum_1 = require("../users/enums/auth-provider.enum");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const wallet_service_1 = require("../wallet/wallet.service");
const rabbitmq_service_1 = require("../infrastructure/rabbitmq/rabbitmq.service");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const SALT_ROUNDS = 12;
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
let AuthService = AuthService_1 = class AuthService {
    usersService;
    jwtService;
    configService;
    authRepository;
    redis;
    walletService;
    rabbitMQService;
    outboxService;
    logger = new common_1.Logger(AuthService_1.name);
    googleClient;
    constructor(usersService, jwtService, configService, authRepository, redis, walletService, rabbitMQService, outboxService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.authRepository = authRepository;
        this.redis = redis;
        this.walletService = walletService;
        this.rabbitMQService = rabbitMQService;
        this.outboxService = outboxService;
        this.googleClient = new google_auth_library_1.OAuth2Client(this.configService.getOrThrow('GOOGLE_CLIENT_ID'));
    }
    async register(registerInput) {
        const existingUser = await this.usersService.findByEmail(registerInput.email);
        if (existingUser) {
            if (existingUser.deletedAt) {
                throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
            }
            throw new email_already_exists_exception_1.EmailAlreadyExistsException();
        }
        const hashedPassword = await bcrypt.hash(registerInput.password, SALT_ROUNDS);
        const createInput = {
            firstName: registerInput.firstName,
            lastName: registerInput.lastName,
            email: registerInput.email,
            password: hashedPassword,
            phoneNumber: registerInput.phoneNumber,
            dateOfBirth: registerInput.dateOfBirth,
            address: registerInput.address,
        };
        await this.withTransaction(async (session) => {
            const u = await this.usersService.create(createInput, session);
            await this.walletService.createWallet(u._id.toString(), session);
            const verificationToken = this.generateEmailVerificationToken(u._id.toString());
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.UserRegistered, {
                userId: u._id.toString(),
                email: u.email,
                name: u.firstName,
                phone: u.phoneNumber,
                verificationToken,
            }, session);
            return u;
        });
        return {
            success: true,
            message: 'Verification email sent. Please check your inbox to verify your account.',
        };
    }
    async login(loginInput) {
        const user = await this.usersService.findByEmailWithPassword(loginInput.email);
        if (!user) {
            throw new invalid_credentials_exception_1.InvalidCredentialsException();
        }
        if (user.deletedAt) {
            throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
        }
        if (user.isBanned) {
            throw new account_banned_exception_1.AccountBannedException();
        }
        if (!user.password) {
            throw new google_account_no_password_exception_1.GoogleAccountNoPasswordException();
        }
        if (!user.isEmailVerified) {
            throw new email_not_verified_exception_1.EmailNotVerifiedException();
        }
        const isPasswordValid = await bcrypt.compare(loginInput.password, user.password ?? '');
        if (!isPasswordValid) {
            throw new invalid_credentials_exception_1.InvalidCredentialsException();
        }
        return this.issueAuthTokens(user);
    }
    async googleRegister(input) {
        const payload = await this.verifyGoogleToken(input.token);
        if (!payload || !payload.email) {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const { sub: googleId, email, email_verified } = payload;
        if (!email_verified) {
            throw new email_not_verified_exception_1.EmailNotVerifiedException();
        }
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            if (existingUser.deletedAt) {
                throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
            }
            throw new email_already_exists_exception_1.EmailAlreadyExistsException();
        }
        const user = await this.withTransaction(async (session) => {
            const u = await this.usersService.createGoogleUser({
                firstName: input.firstName,
                lastName: input.lastName,
                email: email,
                googleId: googleId,
                phoneNumber: input.phoneNumber,
                dateOfBirth: input.dateOfBirth,
                address: input.address,
            }, session);
            await this.walletService.createWallet(u._id.toString(), session);
            return u;
        });
        return this.issueAuthTokens(user);
    }
    async googleLogin(googleLoginInput) {
        const payload = await this.verifyGoogleToken(googleLoginInput.token);
        if (!payload || !payload.email) {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const { sub: googleId, email, email_verified } = payload;
        if (!email_verified) {
            throw new email_not_verified_exception_1.EmailNotVerifiedException();
        }
        let user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new registration_required_exception_1.RegistrationRequiredException();
        }
        if (user.deletedAt) {
            throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
        }
        if (user.isBanned) {
            throw new account_banned_exception_1.AccountBannedException();
        }
        if (!user.googleId && user.authProvider === auth_provider_enum_1.AuthProvider.LOCAL) {
            user = await this.usersService.linkGoogleAccount(user._id.toString(), googleId);
        }
        return this.issueAuthTokens(user);
    }
    async confirmEmail(token) {
        let userId;
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.getOrThrow('JWT_VERIFICATION_SECRET'),
            });
            userId = payload.sub;
        }
        catch {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const user = await this.usersService.findById(userId);
        await this.usersService.verifyEmail(userId);
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        this.rabbitMQService
            .publish(rabbitmq_event_types_1.RabbitMQEvent.EmailVerified, {
            userId,
            email: user.email,
            name,
        })
            .catch((err) => {
            this.logger?.error(`Failed to publish EmailVerified event: ${err instanceof Error ? err.message : String(err)}`);
        });
        return true;
    }
    async requestReactivation(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.deletedAt) {
            return true;
        }
        const verificationToken = this.generateEmailVerificationToken(user._id.toString());
        await this.rabbitMQService.publish(rabbitmq_event_types_1.RabbitMQEvent.AccountReactivationRequested, {
            userId: user._id.toString(),
            email: user.email,
            name: user.firstName,
            phone: user.phoneNumber,
            verificationToken,
        });
        return true;
    }
    async confirmReactivation(token) {
        let userId;
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.getOrThrow('JWT_VERIFICATION_SECRET'),
            });
            userId = payload.sub;
        }
        catch {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const user = await this.usersService.reactivateUser(userId);
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        this.rabbitMQService
            .publish(rabbitmq_event_types_1.RabbitMQEvent.AccountReactivated, {
            userId,
            email: user.email,
            name,
        })
            .catch((err) => {
            this.logger?.error(`Failed to publish AccountReactivated event: ${err instanceof Error ? err.message : String(err)}`);
        });
        return true;
    }
    async resendConfirmationEmail(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return true;
        }
        if (user.isEmailVerified) {
            throw new email_already_verified_exception_1.EmailAlreadyVerifiedException();
        }
        const verificationToken = this.generateEmailVerificationToken(user._id.toString());
        await this.rabbitMQService.publish(rabbitmq_event_types_1.RabbitMQEvent.UserRegistered, {
            userId: user._id.toString(),
            email: user.email,
            name: user.firstName,
            phone: user.phoneNumber,
            verificationToken,
        });
        return true;
    }
    async logout(refreshToken) {
        await this.authRepository.deleteRefreshToken(hashToken(refreshToken));
        return true;
    }
    async logoutAll(userId) {
        await this.authRepository.deleteAllUserTokens(userId);
        return true;
    }
    async refreshTokens(rawRefreshToken) {
        const hashedToken = hashToken(rawRefreshToken);
        const storedToken = await this.authRepository.findRefreshToken(hashedToken);
        if (!storedToken) {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        let payload;
        try {
            payload = this.jwtService.verify(rawRefreshToken, {
                secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            await this.authRepository.deleteRefreshToken(hashedToken);
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        await this.authRepository.deleteRefreshToken(hashedToken);
        const user = await this.usersService.findById(payload.sub);
        if (!user || user.deletedAt || user.isBanned) {
            throw new account_disabled_exception_1.AccountDisabledException();
        }
        return this.issueAuthTokens(user);
    }
    async forgotPassword(input, ip, browser) {
        const user = await this.usersService.findByEmailWithPassword(input.email);
        if (!user)
            return true;
        if (!user.password) {
            throw new google_account_no_password_exception_1.GoogleAccountNoPasswordException();
        }
        const rateLimitKey = `rate-limit:forgot-password:${user._id.toString()}`;
        const recentlyRequested = await this.redis.get(rateLimitKey);
        if (recentlyRequested)
            return true;
        await this.redis.set(rateLimitKey, '1', 'EX', 120);
        const rawToken = this.generateSecureToken();
        const hashedToken = hashToken(rawToken);
        const redisKey = this.getResetPasswordRedisKey(user._id.toString());
        const ttlSeconds = 900;
        await this.redis.set(redisKey, hashedToken, 'EX', ttlSeconds);
        const time = new Date().toUTCString();
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.rabbitMQService.publish(rabbitmq_event_types_1.RabbitMQEvent.PasswordReset, {
            email: user.email,
            name,
            resetToken: rawToken,
            metadata: { ip, browser, time },
        });
        return true;
    }
    async resetPassword(input) {
        const user = await this.usersService.findByEmailWithPassword(input.email);
        if (!user) {
            throw new user_not_found_exception_1.UserNotFoundException();
        }
        const redisKey = this.getResetPasswordRedisKey(user._id.toString());
        const storedHashedToken = await this.redis.get(redisKey);
        if (!storedHashedToken) {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const inputHashedToken = hashToken(input.token);
        if (storedHashedToken !== inputHashedToken) {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
        const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
        await this.usersService.updatePassword(user._id.toString(), hashedPassword);
        await this.redis.del(redisKey);
        await this.logoutAll(user._id.toString());
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        this.rabbitMQService
            .publish(rabbitmq_event_types_1.RabbitMQEvent.PasswordChanged, {
            email: user.email,
            name,
            date: new Date().toUTCString(),
        })
            .catch((err) => {
            this.logger.error(`Failed to publish PasswordChanged event: ${err instanceof Error ? err.message : String(err)}`);
        });
        return true;
    }
    async updatePassword(userId, input) {
        const user = await this.usersService.findByUserIdWithPassword(userId);
        if (!user) {
            throw new user_not_found_exception_1.UserNotFoundException();
        }
        if (!user.password) {
            throw new google_account_no_password_exception_1.GoogleAccountNoPasswordException();
        }
        const isMatch = await bcrypt.compare(input.oldPassword, user.password);
        if (!isMatch) {
            throw new invalid_credentials_exception_1.InvalidCredentialsException();
        }
        const isSamePassword = await bcrypt.compare(input.password, user.password);
        if (isSamePassword) {
            throw new same_password_exception_1.SamePasswordException();
        }
        const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
        await this.usersService.updatePassword(userId, hashedPassword);
        await this.logoutAll(user._id.toString());
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        this.rabbitMQService
            .publish(rabbitmq_event_types_1.RabbitMQEvent.PasswordChanged, {
            email: user.email,
            name,
            date: new Date().toUTCString(),
        })
            .catch((err) => {
            this.logger.error(`Failed to publish PasswordChanged event: ${err instanceof Error ? err.message : String(err)}`);
        });
        return true;
    }
    generateAccessToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
        });
    }
    generateRefreshToken(payload) {
        const token = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        });
        const decoded = this.jwtService.decode(token);
        if (!decoded) {
            throw new Error('Invalid token');
        }
        const expiresAt = new Date(decoded.exp * 1000);
        return { token, expiresAt };
    }
    generateEmailVerificationToken(userId) {
        return this.jwtService.sign({ sub: userId }, {
            secret: this.configService.getOrThrow('JWT_VERIFICATION_SECRET'),
            expiresIn: this.configService.get('JWT_VERIFICATION_EXPIRES_IN', '1h'),
        });
    }
    async verifyGoogleToken(token) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: this.configService.getOrThrow('GOOGLE_CLIENT_ID'),
            });
            return ticket.getPayload();
        }
        catch {
            throw new invalid_token_exception_1.InvalidTokenException();
        }
    }
    async issueAuthTokens(user) {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        const accessToken = this.generateAccessToken(payload);
        const { token: refreshToken, expiresAt } = this.generateRefreshToken(payload);
        await this.authRepository.saveRefreshToken(user._id.toString(), hashToken(refreshToken), expiresAt);
        return { accessToken, refreshToken, user };
    }
    generateSecureToken() {
        return (0, crypto_1.randomBytes)(32).toString('hex');
    }
    getResetPasswordRedisKey(userId) {
        return `password-reset:${userId}`;
    }
    async withTransaction(fn) {
        const session = await this.usersService.startSession();
        session.startTransaction();
        try {
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)('IAuthRepository')),
    __param(4, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService, Object, ioredis_2.default,
        wallet_service_1.WalletService,
        rabbitmq_service_1.RabbitMQService,
        outbox_service_1.OutboxService])
], AuthService);
//# sourceMappingURL=auth.service.js.map