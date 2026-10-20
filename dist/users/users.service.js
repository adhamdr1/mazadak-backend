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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const user_role_enum_1 = require("./enums/user-role.enum");
const auth_provider_enum_1 = require("./enums/auth-provider.enum");
const user_not_found_exception_1 = require("./exceptions/user-not-found.exception");
const email_already_exists_exception_1 = require("./exceptions/email-already-exists.exception");
const phone_already_exists_exception_1 = require("./exceptions/phone-already-exists.exception");
const email_already_verified_exception_1 = require("./exceptions/email-already-verified.exception");
const user_forbidden_exception_1 = require("./exceptions/user-forbidden.exception");
const cannot_ban_admin_exception_1 = require("./exceptions/cannot-ban-admin.exception");
const wallet_has_balance_exception_1 = require("../wallet/exceptions/wallet-has-balance.exception");
const cqrs_1 = require("@nestjs/cqrs");
const get_wallet_balance_query_1 = require("../wallet/queries/get-wallet-balance.query");
const get_user_rating_stats_query_1 = require("../reviews/queries/get-user-rating-stats.query");
const get_user_auctions_count_query_1 = require("../auctions/queries/get-user-auctions-count.query");
const decimal_js_1 = __importDefault(require("decimal.js"));
let UsersService = class UsersService {
    userRepository;
    queryBus;
    redis;
    outboxService;
    constructor(userRepository, queryBus, redis, outboxService) {
        this.userRepository = userRepository;
        this.queryBus = queryBus;
        this.redis = redis;
        this.outboxService = outboxService;
    }
    async startSession() {
        return await this.userRepository.startSession();
    }
    buildPage(items, total, limit, page) {
        return {
            items,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
        };
    }
    async create(createUserInput, session) {
        const existingEmail = await this.userRepository.findByEmail(createUserInput.email);
        if (existingEmail)
            throw new email_already_exists_exception_1.EmailAlreadyExistsException();
        const existingPhone = await this.userRepository.findByPhoneNumber(createUserInput.phoneNumber);
        if (existingPhone)
            throw new phone_already_exists_exception_1.PhoneAlreadyExistsException();
        return await this.userRepository.create({
            firstName: createUserInput.firstName,
            lastName: createUserInput.lastName,
            email: createUserInput.email,
            password: createUserInput.password,
            phoneNumber: createUserInput.phoneNumber,
            dateOfBirth: createUserInput.dateOfBirth,
            address: createUserInput.address,
        }, session);
    }
    async createGoogleUser(dto, session) {
        const existingEmail = await this.userRepository.findByEmail(dto.email);
        if (existingEmail)
            throw new email_already_exists_exception_1.EmailAlreadyExistsException();
        const existingPhone = await this.userRepository.findByPhoneNumber(dto.phoneNumber);
        if (existingPhone)
            throw new phone_already_exists_exception_1.PhoneAlreadyExistsException();
        return await this.userRepository.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            authProvider: auth_provider_enum_1.AuthProvider.GOOGLE,
            googleId: dto.googleId,
            isEmailVerified: true,
            phoneNumber: dto.phoneNumber,
            dateOfBirth: dto.dateOfBirth,
            address: dto.address,
        }, session);
    }
    async findById(id) {
        const user = await this.userRepository.findById(id);
        if (!user)
            throw new user_not_found_exception_1.UserNotFoundException();
        return user;
    }
    async findByIdIncludingDeleted(id) {
        const user = await this.userRepository.findByIdIncludingDeleted(id);
        if (!user)
            throw new user_not_found_exception_1.UserNotFoundException();
        return user;
    }
    async findByEmail(email) {
        return this.userRepository.findByEmail(email);
    }
    async findByEmailWithPassword(email) {
        return this.userRepository.findByEmailWithPassword(email);
    }
    async findByUserIdWithPassword(userId) {
        return this.userRepository.findByUserIdWithPassword(userId);
    }
    async findByGoogleId(googleId) {
        return this.userRepository.findByGoogleId(googleId);
    }
    async findAll(pagination, filter) {
        const { items, total } = await this.userRepository.findAll(pagination.page, pagination.limit, filter);
        return this.buildPage(items, total, pagination.limit, pagination.page);
    }
    async updateProfile(currentUser, targetId, data) {
        if (currentUser.role !== user_role_enum_1.UserRole.ADMIN && currentUser.sub !== targetId) {
            throw new user_forbidden_exception_1.UserForbiddenException();
        }
        if (data.email) {
            const existing = await this.userRepository.findByEmail(data.email);
            if (existing && existing._id.toString() !== targetId) {
                throw new email_already_exists_exception_1.EmailAlreadyExistsException();
            }
        }
        if (data.phoneNumber) {
            const existing = await this.userRepository.findByPhoneNumber(data.phoneNumber);
            if (existing && existing._id.toString() !== targetId) {
                throw new phone_already_exists_exception_1.PhoneAlreadyExistsException();
            }
        }
        const updated = await this.userRepository.update(targetId, data);
        if (!updated)
            throw new user_not_found_exception_1.UserNotFoundException();
        return updated;
    }
    async verifyEmail(id) {
        const user = await this.findById(id);
        if (user.isEmailVerified)
            throw new email_already_verified_exception_1.EmailAlreadyVerifiedException();
        await this.userRepository.update(id, { isEmailVerified: true });
    }
    async softDeleteUser(targetId, currentUser) {
        if (targetId === currentUser.sub) {
            throw new user_forbidden_exception_1.UserForbiddenException();
        }
        await this.findById(targetId);
        const session = await this.startSession();
        try {
            session.startTransaction();
            const wallet = await this.queryBus.execute(new get_wallet_balance_query_1.GetWalletBalanceQuery(targetId, session));
            if (new decimal_js_1.default(wallet.balance).greaterThan(0) ||
                new decimal_js_1.default(wallet.heldBalance).greaterThan(0)) {
                throw new wallet_has_balance_exception_1.WalletHasBalanceException();
            }
            await this.userRepository.softDelete(targetId, session);
            await this.redis.del(`user:auth-status:${targetId}`);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.UserSoftDeleted, { userId: targetId }, session);
            await session.commitTransaction();
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    async reactivateUser(id, session) {
        const updated = await this.userRepository.reactivate(id, session);
        if (!updated)
            throw new user_not_found_exception_1.UserNotFoundException();
        await this.redis.del(`user:auth-status:${id}`);
        return updated;
    }
    async linkGoogleAccount(userId, googleId) {
        const updatedUser = await this.userRepository.linkGoogleAccount(userId, googleId);
        if (!updatedUser)
            throw new user_not_found_exception_1.UserNotFoundException();
        return updatedUser;
    }
    async updatePassword(id, newHashedPassword) {
        const updated = await this.userRepository.update(id, {
            password: newHashedPassword,
        });
        if (!updated)
            throw new user_not_found_exception_1.UserNotFoundException();
    }
    async toggleBan(userId) {
        const user = await this.findById(userId);
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            throw new cannot_ban_admin_exception_1.CannotBanAdminException();
        }
        const session = await this.startSession();
        try {
            session.startTransaction();
            const updatedUser = (await this.userRepository.update(userId, { isBanned: !user.isBanned }, session));
            await this.redis.del(`user:auth-status:${userId}`);
            if (updatedUser.isBanned) {
                await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.UserBanned, { userId }, session);
            }
            await session.commitTransaction();
            return updatedUser;
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    async countVerifiedUsers() {
        return this.userRepository.countVerified();
    }
    async countAll(filter) {
        return this.userRepository.countAll(filter);
    }
    async getPublicProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new user_not_found_exception_1.UserNotFoundException();
        }
        const [ratingStats, auctionsCount] = await Promise.all([
            this.queryBus.execute(new get_user_rating_stats_query_1.GetUserRatingStatsQuery(userId)),
            this.queryBus.execute(new get_user_auctions_count_query_1.GetUserAuctionsCountQuery(userId)),
        ]);
        return {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            city: user.address?.city,
            memberSince: user.createdAt,
            ratingStats,
            activeAuctionsCount: auctionsCount?.active ?? 0,
            completedAuctionsCount: auctionsCount?.completed ?? 0,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IUserRepository')),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, cqrs_1.QueryBus,
        ioredis_2.default,
        outbox_service_1.OutboxService])
], UsersService);
//# sourceMappingURL=users.service.js.map