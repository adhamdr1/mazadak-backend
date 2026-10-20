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
var AutoBiddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBiddingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const decimal_js_1 = __importDefault(require("decimal.js"));
const redis_constants_1 = require("../../infrastructure/redis/redis.constants");
const auto_bid_status_enum_1 = require("../enums/auto-bid-status.enum");
const bid_status_enum_1 = require("../enums/bid-status.enum");
const wallet_service_1 = require("../../wallet/wallet.service");
const transaction_reference_type_enum_1 = require("../../transaction/enums/transaction-reference-type.enum");
const realtime_service_1 = require("../../infrastructure/pubsub/realtime.service");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const outbox_service_1 = require("../../infrastructure/outbox/outbox.service");
const rabbitmq_event_types_1 = require("../../infrastructure/rabbitmq/rabbitmq-event.types");
const proxy_bidding_engine_service_1 = require("./proxy-bidding-engine.service");
const auction_status_enum_1 = require("../../auctions/enums/auction-status.enum");
const auction_not_found_exception_1 = require("../../auctions/exceptions/auction-not-found.exception");
const auction_not_active_exception_1 = require("../exceptions/auction-not-active.exception");
const auto_bid_on_own_auction_exception_1 = require("../exceptions/auto-bid-on-own-auction.exception");
const auto_bid_max_too_low_exception_1 = require("../exceptions/auto-bid-max-too-low.exception");
const auto_bid_duplicate_max_exception_1 = require("../exceptions/auto-bid-duplicate-max.exception");
const auto_bid_insufficient_balance_exception_1 = require("../exceptions/auto-bid-insufficient-balance.exception");
const auto_bid_not_found_exception_1 = require("../exceptions/auto-bid-not-found.exception");
const bidding_busy_exception_1 = require("../exceptions/bidding-busy.exception");
const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';
let AutoBiddingService = AutoBiddingService_1 = class AutoBiddingService {
    autoBidRepository;
    bidRepository;
    auctionRepository;
    proxyEngine;
    walletService;
    realtimeService;
    redisService;
    outboxService;
    redis;
    logger = new common_1.Logger(AutoBiddingService_1.name);
    constructor(autoBidRepository, bidRepository, auctionRepository, proxyEngine, walletService, realtimeService, redisService, outboxService, redis) {
        this.autoBidRepository = autoBidRepository;
        this.bidRepository = bidRepository;
        this.auctionRepository = auctionRepository;
        this.proxyEngine = proxyEngine;
        this.walletService = walletService;
        this.realtimeService = realtimeService;
        this.redisService = redisService;
        this.outboxService = outboxService;
        this.redis = redis;
    }
    async setAutoBid(userId, input) {
        let acquiredLock = false;
        const lockKey = `auction:bid:lock:${input.auctionId}`;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(lockKey, lockValue, 'EX', 5, 'NX')
                .catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Redis setAutoBid lock error: ${msg}`);
                return null;
            });
            if (!lockResult) {
                throw new bidding_busy_exception_1.BiddingBusyException();
            }
            acquiredLock = true;
            const session = await this.bidRepository.startSession();
            session.startTransaction();
            try {
                const auction = await this.auctionRepository.findById(input.auctionId, session);
                if (!auction) {
                    throw new auction_not_found_exception_1.AuctionNotFoundException();
                }
                if (auction.status !== auction_status_enum_1.AuctionStatus.ACTIVE) {
                    throw new auction_not_active_exception_1.AuctionNotActiveException();
                }
                if (auction.sellerId.toString() === userId) {
                    throw new auto_bid_on_own_auction_exception_1.AutoBidOnOwnAuctionException();
                }
                const currentWinner = await this.bidRepository.findWinningByAuctionId(input.auctionId, session);
                const currentPrice = currentWinner
                    ? Number(auction.currentPrice.toString())
                    : Number(auction.startingPrice.toString());
                const increment = Number(auction.minimumBidIncrement.toString());
                const minimumRequired = currentWinner
                    ? new decimal_js_1.default(currentPrice).plus(increment).toNumber()
                    : Number(auction.startingPrice.toString());
                if (input.maxAmount < minimumRequired) {
                    throw new auto_bid_max_too_low_exception_1.AutoBidMaxTooLowException();
                }
                const existingSameMax = await this.autoBidRepository.findActiveByAuctionAndMaxAmount(input.auctionId, input.maxAmount, session);
                if (existingSameMax && existingSameMax.userId.toString() !== userId) {
                    throw new auto_bid_duplicate_max_exception_1.AutoBidDuplicateMaxException();
                }
                const isUserCurrentWinner = currentWinner?.bidderId.toString() === userId;
                const currentAuctionCommitment = isUserCurrentWinner
                    ? new decimal_js_1.default(currentWinner.amount.toString()).toNumber()
                    : 0;
                const requiredDelta = new decimal_js_1.default(input.maxAmount)
                    .minus(currentAuctionCommitment)
                    .toNumber();
                const wallet = await this.walletService.getWalletByUserId(userId);
                const availableBalance = new decimal_js_1.default(wallet.balance.toString())
                    .minus(wallet.heldBalance.toString())
                    .toNumber();
                if (requiredDelta > 0 && availableBalance < requiredDelta) {
                    throw new auto_bid_insufficient_balance_exception_1.AutoBidInsufficientBalanceException();
                }
                const autoBid = await this.autoBidRepository.upsert({
                    auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                    userId: new mongoose_1.Types.ObjectId(userId),
                    maxAmount: input.maxAmount,
                }, session);
                const activeAutoBids = await this.autoBidRepository.findActiveByAuctionId(input.auctionId, session);
                const engineResult = this.proxyEngine.calculateNextState({
                    startPrice: Number(auction.startingPrice.toString()),
                    currentPrice,
                    minimumBidIncrement: increment,
                    hasExistingBids: !!currentWinner,
                    currentWinnerId: currentWinner?.bidderId.toString(),
                }, activeAutoBids.map((ab) => ({
                    id: ab._id.toString(),
                    userId: ab.userId.toString(),
                    maxAmount: Number(ab.maxAmount.toString()),
                    createdAt: ab.createdAt,
                })));
                for (const exhaustedId of engineResult.exhaustedAutoBidIds) {
                    await this.autoBidRepository.updateStatus(exhaustedId, auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session);
                    const exhaustedAutoBid = activeAutoBids.find((ab) => ab._id.toString() === exhaustedId);
                    if (exhaustedAutoBid &&
                        exhaustedAutoBid.userId.toString() !== engineResult.winningBidderId) {
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AutoBidExhausted, {
                            autoBidId: exhaustedId,
                            auctionId: input.auctionId,
                            auctionTitle: auction.title,
                            userId: exhaustedAutoBid.userId.toString(),
                            maxAmount: Number(exhaustedAutoBid.maxAmount.toString()),
                            currentPrice: engineResult.winningAmount,
                        }, session);
                    }
                }
                let newWinningBid = currentWinner;
                let priceChanged = false;
                if (engineResult.bidsToCreate.length > 0) {
                    const winningCandidate = engineResult.bidsToCreate.find((b) => b.status === bid_status_enum_1.BidStatus.WINNING);
                    if (winningCandidate) {
                        priceChanged = true;
                        let outbidTransactionId;
                        const isWinnerAlreadyWinning = currentWinner?.bidderId.toString() === winningCandidate.bidderId;
                        const previousHoldToRelease = isWinnerAlreadyWinning
                            ? new decimal_js_1.default(currentWinner.amount.toString()).toNumber()
                            : 0;
                        const winnerWallet = await this.walletService.getWalletByUserId(winningCandidate.bidderId);
                        const winnerAvailable = new decimal_js_1.default(winnerWallet.balance.toString())
                            .minus(winnerWallet.heldBalance.toString())
                            .plus(previousHoldToRelease)
                            .toNumber();
                        if (winnerAvailable < winningCandidate.amount &&
                            engineResult.winningAutoBidId) {
                            priceChanged = false;
                            await this.autoBidRepository.updateStatus(engineResult.winningAutoBidId, auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session);
                            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AutoBidExhausted, {
                                autoBidId: engineResult.winningAutoBidId,
                                auctionId: input.auctionId,
                                auctionTitle: auction.title,
                                userId: winningCandidate.bidderId,
                                maxAmount: winningCandidate.amount,
                                currentPrice: winningCandidate.amount,
                            }, session);
                        }
                        else {
                            if (currentWinner) {
                                const prevWinnerId = currentWinner.bidderId.toString();
                                const prevAmount = Number(currentWinner.amount.toString());
                                const { transaction } = await this.walletService.release(prevWinnerId, prevAmount, input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                                outbidTransactionId = transaction._id.toString();
                                await this.bidRepository.updateStatus(currentWinner._id.toString(), bid_status_enum_1.BidStatus.OUTBID, session);
                            }
                            await this.walletService.hold(winningCandidate.bidderId, winningCandidate.amount, input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                            newWinningBid = await this.bidRepository.create({
                                auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                                bidderId: new mongoose_1.Types.ObjectId(winningCandidate.bidderId),
                                amount: winningCandidate.amount,
                                status: bid_status_enum_1.BidStatus.WINNING,
                            }, session);
                            await this.auctionRepository.updateCurrentPrice(input.auctionId, winningCandidate.amount, session);
                            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.BidPlaced, {
                                bidId: newWinningBid._id.toString(),
                                auctionId: input.auctionId,
                                auctionTitle: auction.title,
                                sellerId: auction.sellerId.toString(),
                                bidderId: winningCandidate.bidderId,
                                amount: winningCandidate.amount,
                                outbidUserId: currentWinner?.bidderId.toString(),
                                outbidTransactionId,
                            }, session);
                            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AutoBidPlaced, {
                                bidId: newWinningBid._id.toString(),
                                auctionId: input.auctionId,
                                auctionTitle: auction.title,
                                bidderId: winningCandidate.bidderId,
                                amount: winningCandidate.amount,
                                isAutoBid: true,
                            }, session);
                        }
                    }
                }
                await session.commitTransaction();
                void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
                if (priceChanged && newWinningBid) {
                    const publishedBid = newWinningBid;
                    this.bidRepository
                        .countByAuctionId(input.auctionId)
                        .then((bidCount) => {
                        void this.realtimeService.publishBidAdded({
                            bid: publishedBid,
                            currentPrice: Number(publishedBid.amount.toString()),
                            leadingBidderId: publishedBid.bidderId.toString(),
                            bidCount,
                        });
                    })
                        .catch((err) => {
                        this.logger.error(`Failed to fetch bid count for publish: ${err.message}`);
                    });
                }
                return autoBid;
            }
            catch (error) {
                await session.abortTransaction();
                throw error;
            }
            finally {
                await session.endSession();
            }
        }
        finally {
            if (acquiredLock) {
                try {
                    await this.redis.eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue);
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.warn(`Failed to release Redis setAutoBid lock: ${msg}`);
                }
            }
        }
    }
    async cancelAutoBid(userId, input) {
        const existing = await this.autoBidRepository.findActiveByAuctionAndUser(input.auctionId, userId);
        if (!existing) {
            throw new auto_bid_not_found_exception_1.AutoBidNotFoundException();
        }
        const cancelled = await this.autoBidRepository.cancel(input.auctionId, userId);
        return cancelled !== null;
    }
    async getMyAutoBid(userId, auctionId, session) {
        return await this.autoBidRepository.findByAuctionAndUser(auctionId, userId, session);
    }
    async getUserAutoBids(userId, page = 1, limit = 10, status) {
        const { items, total } = await this.autoBidRepository.findByUserId(userId, page, limit, status);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
};
exports.AutoBiddingService = AutoBiddingService;
exports.AutoBiddingService = AutoBiddingService = AutoBiddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IAutoBidRepository')),
    __param(1, (0, common_1.Inject)('IBidRepository')),
    __param(2, (0, common_1.Inject)('IAuctionRepository')),
    __param(8, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, Object, Object, proxy_bidding_engine_service_1.ProxyBiddingEngineService,
        wallet_service_1.WalletService,
        realtime_service_1.RealtimeService,
        redis_service_1.RedisService,
        outbox_service_1.OutboxService,
        ioredis_2.default])
], AutoBiddingService);
//# sourceMappingURL=auto-bidding.service.js.map