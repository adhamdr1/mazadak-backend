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
var AuctionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionsService = exports.AUCTION_STATUS_CHANGED = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const schedule_1 = require("@nestjs/schedule");
const redis_constants_1 = require("../infrastructure/redis/redis.constants");
const auction_status_enum_1 = require("./enums/auction-status.enum");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const auction_not_found_exception_1 = require("./exceptions/auction-not-found.exception");
const auction_invalid_state_exception_1 = require("./exceptions/auction-invalid-state.exception");
const auction_forbidden_exception_1 = require("./exceptions/auction-forbidden.exception");
const auction_start_time_too_soon_exception_1 = require("./exceptions/auction-start-time-too-soon.exception");
const auction_end_time_invalid_exception_1 = require("./exceptions/auction-end-time-invalid.exception");
const auction_not_pending_exception_1 = require("./exceptions/auction-not-pending.exception");
const upload_service_1 = require("../upload/upload.service");
const wallet_service_1 = require("../wallet/wallet.service");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const redis_service_1 = require("../infrastructure/redis/redis.service");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
exports.AUCTION_STATUS_CHANGED = 'AUCTION_STATUS_CHANGED';
const MIN_START_TIME_MS = 15 * 60 * 1000;
const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';
const ACTIVE_AUCTIONS_SOFT_TTL_MS = 5 * 60 * 1000;
const ACTIVE_AUCTIONS_HARD_TTL_S = 60 * 60;
const ACTIVATE_AUCTIONS_LOCK_KEY = 'auction:activate:lock';
const END_AUCTIONS_LOCK_KEY = 'auction:end:lock';
const LOCK_TTL_SECONDS = 30;
let AuctionsService = AuctionsService_1 = class AuctionsService {
    auctionRepository;
    uploadService;
    walletService;
    realtimeService;
    redisService;
    outboxService;
    redis;
    logger = new common_1.Logger(AuctionsService_1.name);
    constructor(auctionRepository, uploadService, walletService, realtimeService, redisService, outboxService, redis) {
        this.auctionRepository = auctionRepository;
        this.uploadService = uploadService;
        this.walletService = walletService;
        this.realtimeService = realtimeService;
        this.redisService = redisService;
        this.outboxService = outboxService;
        this.redis = redis;
    }
    validateTimes(startTime, endTime) {
        const now = Date.now();
        if (startTime.getTime() - now < MIN_START_TIME_MS) {
            throw new auction_start_time_too_soon_exception_1.AuctionStartTimeTooSoonException();
        }
        if (endTime <= startTime) {
            throw new auction_end_time_invalid_exception_1.AuctionEndTimeInvalidException();
        }
    }
    async getAuctionOrThrow(id) {
        const auction = await this.auctionRepository.findById(id);
        if (!auction)
            throw new auction_not_found_exception_1.AuctionNotFoundException();
        return auction;
    }
    assertOwner(auction, userId) {
        if (auction.sellerId.toString() !== userId) {
            throw new auction_forbidden_exception_1.AuctionForbiddenException();
        }
    }
    toPlainAuction(auction) {
        const raw = auction;
        if (typeof raw.toObject === 'function') {
            return raw.toObject();
        }
        if (raw._doc) {
            return { ...raw._doc };
        }
        return auction;
    }
    assertPending(auction) {
        if (auction.status !== auction_status_enum_1.AuctionStatus.PENDING) {
            throw new auction_not_pending_exception_1.AuctionNotPendingException();
        }
    }
    buildPage(items, total, pagination) {
        return {
            items,
            total,
            totalPages: Math.ceil(total / pagination.limit),
            hasNextPage: pagination.page * pagination.limit < total,
        };
    }
    async createAuction(sellerId, input) {
        this.validateTimes(input.startTime, input.endTime);
        const auction = await this.auctionRepository.create({
            sellerId: new mongoose_1.Types.ObjectId(sellerId),
            title: input.title,
            description: input.description,
            category: input.category,
            startingPrice: input.startingPrice,
            minimumBidIncrement: input.minimumBidIncrement,
            images: input.images,
            startTime: input.startTime,
            endTime: input.endTime,
        });
        void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
        await this.realtimeService.publishAuctionCreated(auction);
        return auction;
    }
    async findAuctions(input, filter) {
        if (filter.status === auction_status_enum_1.AuctionStatus.ACTIVE) {
            const cacheKey = `auction:active:cat:${filter.category ?? 'none'}` +
                `:search:${filter.search ?? 'none'}` +
                `:p:${input.page}:l:${input.limit}`;
            return this.redisService.getOrSetSWR(cacheKey, ACTIVE_AUCTIONS_SOFT_TTL_MS, ACTIVE_AUCTIONS_HARD_TTL_S, async () => {
                const { items, total } = await this.auctionRepository.findAll(input.page, input.limit, filter, [auction_status_enum_1.AuctionStatus.CANCELLED]);
                return this.buildPage(items, total, input);
            });
        }
        const { items, total } = await this.auctionRepository.findAll(input.page, input.limit, filter, [auction_status_enum_1.AuctionStatus.CANCELLED]);
        return this.buildPage(items, total, input);
    }
    async findAllForAdmin(input, filter) {
        const { items, total } = await this.auctionRepository.findAll(input.page, input.limit, filter);
        return this.buildPage(items, total, input);
    }
    async countAuctions(filter, excludeStatuses) {
        return this.auctionRepository.count(filter, excludeStatuses);
    }
    async findAuction(id) {
        return this.getAuctionOrThrow(id);
    }
    async findMyAuctions(sellerId, input, filter) {
        const { items, total } = await this.auctionRepository.findBySellerId(sellerId, input.page, input.limit, filter);
        return this.buildPage(items, total, input);
    }
    async findWonAuctions(winnerId, input, filter) {
        const { items, total } = await this.auctionRepository.findByWinnerId(winnerId, input.page, input.limit, filter);
        return this.buildPage(items, total, input);
    }
    async updateAuction(auctionId, sellerId, input) {
        const auction = await this.getAuctionOrThrow(auctionId);
        this.assertOwner(auction, sellerId);
        this.assertPending(auction);
        if (input.startTime || input.endTime) {
            const newStart = input.startTime ?? auction.startTime;
            const newEnd = input.endTime ?? auction.endTime;
            this.validateTimes(newStart, newEnd);
        }
        let deletedImages = [];
        if (input.images) {
            const newImages = input.images;
            deletedImages = auction.images.filter((img) => !newImages.includes(img));
        }
        const updated = await this.auctionRepository.update(auctionId, input);
        if (!updated)
            throw new auction_not_found_exception_1.AuctionNotFoundException();
        void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
        if (deletedImages.length > 0) {
            Promise.allSettled(deletedImages.map((url) => this.uploadService.deleteImage(sellerId, url))).catch((err) => this.logger.error(`Failed to clean up images for auction ${auctionId}`, err));
        }
        return updated;
    }
    async cancelAllActiveAuctionsForSeller(sellerId) {
        const auctions = await this.auctionRepository.findActiveOrPendingBySellerId(sellerId);
        this.logger.log(`Found ${auctions.length} active/pending auction(s) to cancel for seller ${sellerId}`);
        for (const auction of auctions) {
            try {
                await this.cancelAuction(auction._id.toString(), sellerId, user_role_enum_1.UserRole.ADMIN);
                this.logger.log(`Successfully cancelled auction ${auction._id.toString()} for seller ${sellerId}`);
            }
            catch (err) {
                this.logger.error(`Failed to cancel auction ${auction._id.toString()} for seller ${sellerId}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }
    async cancelAuction(auctionId, userId, role) {
        const auction = await this.getAuctionOrThrow(auctionId);
        const isOwner = auction.sellerId.toString() === userId;
        const isAdmin = role === user_role_enum_1.UserRole.ADMIN;
        if (!isOwner && !isAdmin)
            throw new auction_forbidden_exception_1.AuctionForbiddenException();
        if (auction.status !== auction_status_enum_1.AuctionStatus.PENDING &&
            auction.status !== auction_status_enum_1.AuctionStatus.ACTIVE) {
            throw new auction_invalid_state_exception_1.AuctionInvalidStateException();
        }
        const session = await this.auctionRepository.startSession();
        session.startTransaction();
        try {
            let winningBid = null;
            if (auction.status === auction_status_enum_1.AuctionStatus.ACTIVE) {
                winningBid = await this.auctionRepository.findWinningBidByAuctionId(auctionId, session);
                if (winningBid) {
                    const bidderId = winningBid.bidderId;
                    await this.walletService.release(bidderId, winningBid.amount, auctionId, session);
                }
            }
            await this.auctionRepository.updateStatus(auctionId, auction_status_enum_1.AuctionStatus.CANCELLED, session);
            let highestBidderId;
            let refundAmount;
            if (winningBid) {
                highestBidderId = winningBid.bidderId;
                refundAmount = winningBid.amount;
            }
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelled, {
                auctionId,
                auctionTitle: auction.title,
                sellerId: auction.sellerId.toString(),
                highestBidderId,
                refundAmount,
            }, session);
            await session.commitTransaction();
            void this.realtimeService.publishAuctionStatusChanged({
                auction: {
                    ...this.toPlainAuction(auction),
                    status: auction_status_enum_1.AuctionStatus.CANCELLED,
                },
            });
            void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
            return true;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Transaction aborted during cancelAuction for ${auctionId}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async adminCancelAuction(auctionId, reason) {
        if (!reason || reason.trim().length < 10) {
            throw new common_1.BadRequestException('REASON_TOO_SHORT');
        }
        const auction = await this.getAuctionOrThrow(auctionId);
        if (auction.status !== auction_status_enum_1.AuctionStatus.PENDING &&
            auction.status !== auction_status_enum_1.AuctionStatus.ACTIVE) {
            throw new auction_invalid_state_exception_1.AuctionInvalidStateException();
        }
        const session = await this.auctionRepository.startSession();
        session.startTransaction();
        try {
            let winningBid = null;
            if (auction.status === auction_status_enum_1.AuctionStatus.ACTIVE) {
                winningBid = await this.auctionRepository.findWinningBidByAuctionId(auctionId, session);
                if (winningBid) {
                    const bidderId = winningBid.bidderId;
                    await this.walletService.release(bidderId, winningBid.amount, auctionId, session);
                }
            }
            await this.auctionRepository.updateStatus(auctionId, auction_status_enum_1.AuctionStatus.CANCELLED, session, reason);
            let highestBidderId;
            let refundAmount;
            if (winningBid) {
                highestBidderId = winningBid.bidderId;
                refundAmount = winningBid.amount;
            }
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelledByAdmin, {
                auctionId,
                auctionTitle: auction.title,
                sellerId: auction.sellerId.toString(),
                adminActionReason: reason,
                highestBidderId,
                refundAmount,
            }, session);
            await session.commitTransaction();
            void this.realtimeService.publishAuctionStatusChanged({
                auction: {
                    ...this.toPlainAuction(auction),
                    status: auction_status_enum_1.AuctionStatus.CANCELLED,
                    adminActionReason: reason,
                },
            });
            void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
            return true;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Transaction aborted during adminCancelAuction for ${auctionId}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async activatePendingAuctions() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(ACTIVATE_AUCTIONS_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis activate auctions lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const auctions = await this.auctionRepository.findPendingToActivate();
            if (!auctions.length)
                return;
            for (const auction of auctions) {
                const session = await this.auctionRepository.startSession();
                try {
                    session.startTransaction();
                    await this.auctionRepository.updateStatus(auction._id.toString(), auction_status_enum_1.AuctionStatus.ACTIVE, session);
                    await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AuctionStarted, {
                        auctionId: auction._id.toString(),
                        auctionTitle: auction.title,
                        sellerId: auction.sellerId.toString(),
                    }, session);
                    await session.commitTransaction();
                    void this.realtimeService.publishAuctionStatusChanged({
                        auction: {
                            ...this.toPlainAuction(auction),
                            status: auction_status_enum_1.AuctionStatus.ACTIVE,
                        },
                    });
                }
                catch (err) {
                    await session.abortTransaction();
                    this.logger.error(`Failed to activate auction ${auction._id.toString()}: ${err instanceof Error ? err.message : String(err)}`);
                }
                finally {
                    await session.endSession();
                }
            }
            void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
            this.logger.log(`Activated ${auctions.length} auction(s)`);
        }
        catch (err) {
            this.logger.error(`Failed to run activatePendingAuctions: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, ACTIVATE_AUCTIONS_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
    async endActiveAuctions() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(END_AUCTIONS_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis end auctions lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const auctions = await this.auctionRepository.findActiveToEnd();
            if (!auctions.length)
                return;
            const ids = auctions.map((a) => a._id);
            await this.auctionRepository.updateManyStatus(ids, auction_status_enum_1.AuctionStatus.ENDED);
            this.logger.log(`Ended ${ids.length} auction(s)`);
            void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
            for (const auction of auctions) {
                void this.realtimeService.publishAuctionStatusChanged({
                    auction: {
                        ...this.toPlainAuction(auction),
                        status: auction_status_enum_1.AuctionStatus.ENDED,
                    },
                });
            }
        }
        catch (err) {
            this.logger.error(`Failed to run endActiveAuctions: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, END_AUCTIONS_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
};
exports.AuctionsService = AuctionsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuctionsService.prototype, "activatePendingAuctions", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuctionsService.prototype, "endActiveAuctions", null);
exports.AuctionsService = AuctionsService = AuctionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IAuctionRepository')),
    __param(6, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, upload_service_1.UploadService,
        wallet_service_1.WalletService,
        realtime_service_1.RealtimeService,
        redis_service_1.RedisService,
        outbox_service_1.OutboxService,
        ioredis_2.default])
], AuctionsService);
//# sourceMappingURL=auctions.service.js.map