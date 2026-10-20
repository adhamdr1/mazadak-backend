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
var BidsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidsService = exports.BID_ADDED = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const schedule_1 = require("@nestjs/schedule");
const redis_constants_1 = require("../infrastructure/redis/redis.constants");
const bid_status_enum_1 = require("./enums/bid-status.enum");
const auto_bid_status_enum_1 = require("./enums/auto-bid-status.enum");
const wallet_service_1 = require("../wallet/wallet.service");
const transaction_reference_type_enum_1 = require("../transaction/enums/transaction-reference-type.enum");
const auction_status_enum_1 = require("../auctions/enums/auction-status.enum");
const already_highest_bidder_exception_1 = require("./exceptions/already-highest-bidder.exception");
const auction_not_active_exception_1 = require("./exceptions/auction-not-active.exception");
const bid_amount_too_low_exception_1 = require("./exceptions/bid-amount-too-low.exception");
const bid_on_own_auction_exception_1 = require("./exceptions/bid-on-own-auction.exception");
const invalid_auction_id_exception_1 = require("./exceptions/invalid-auction-id.exception");
const auction_not_found_exception_1 = require("../auctions/exceptions/auction-not-found.exception");
const bidding_busy_exception_1 = require("./exceptions/bidding-busy.exception");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const redis_service_1 = require("../infrastructure/redis/redis.service");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const proxy_bidding_engine_service_1 = require("./services/proxy-bidding-engine.service");
const services_1 = require("../escrow/services");
const decimal_js_1 = __importDefault(require("decimal.js"));
const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';
const FINALIZE_AUCTIONS_LOCK_KEY = 'auction:finalize:lock';
const FINALIZE_LOCK_TTL_SECONDS = 55;
exports.BID_ADDED = 'BID_ADDED';
let BidsService = BidsService_1 = class BidsService {
    bidRepository;
    autoBidRepository;
    auctionRepository;
    proxyEngine;
    walletService;
    escrowService;
    realtimeService;
    redisService;
    outboxService;
    redis;
    logger = new common_1.Logger(BidsService_1.name);
    constructor(bidRepository, autoBidRepository, auctionRepository, proxyEngine, walletService, escrowService, realtimeService, redisService, outboxService, redis) {
        this.bidRepository = bidRepository;
        this.autoBidRepository = autoBidRepository;
        this.auctionRepository = auctionRepository;
        this.proxyEngine = proxyEngine;
        this.walletService = walletService;
        this.escrowService = escrowService;
        this.realtimeService = realtimeService;
        this.redisService = redisService;
        this.outboxService = outboxService;
        this.redis = redis;
    }
    async placeBid(userId, input) {
        let acquiredLock = false;
        const lockKey = `auction:bid:lock:${input.auctionId}`;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(lockKey, lockValue, 'EX', 5, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis placeBid lock error: ${err instanceof Error ? err.message : String(err)}`);
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
                    throw new bid_on_own_auction_exception_1.BidOnOwnAuctionException();
                }
                const currentWinner = await this.bidRepository.findWinningByAuctionId(input.auctionId, session);
                if (currentWinner && currentWinner.bidderId.toString() === userId) {
                    throw new already_highest_bidder_exception_1.AlreadyHighestBidderException();
                }
                const currentPrice = currentWinner
                    ? Number(auction.currentPrice.toString())
                    : Number(auction.startingPrice.toString());
                const increment = Number(auction.minimumBidIncrement.toString());
                const minimumRequired = currentWinner
                    ? new decimal_js_1.default(currentPrice).plus(increment).toNumber()
                    : Number(auction.startingPrice.toString());
                if (input.amount < minimumRequired) {
                    throw new bid_amount_too_low_exception_1.BidAmountTooLowException();
                }
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
                })), { bidderId: userId, amount: input.amount });
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
                let userBid;
                let finalWinningBid;
                let outbidTransactionId;
                if (engineResult.winningBidderId === userId) {
                    await this.walletService.hold(userId, input.amount, input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                    if (currentWinner) {
                        const { transaction } = await this.walletService.release(currentWinner.bidderId.toString(), Number(currentWinner.amount.toString()), input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                        outbidTransactionId = transaction._id.toString();
                        await this.bidRepository.updateStatus(currentWinner._id.toString(), bid_status_enum_1.BidStatus.OUTBID, session);
                    }
                    userBid = await this.bidRepository.create({
                        auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                        bidderId: new mongoose_1.Types.ObjectId(userId),
                        amount: input.amount,
                        status: bid_status_enum_1.BidStatus.WINNING,
                    }, session);
                    finalWinningBid = userBid;
                    await this.auctionRepository.updateCurrentPrice(input.auctionId, input.amount, session);
                    await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.BidPlaced, {
                        bidId: userBid._id.toString(),
                        auctionId: input.auctionId,
                        auctionTitle: auction.title,
                        sellerId: auction.sellerId.toString(),
                        bidderId: userId,
                        amount: input.amount,
                        outbidUserId: currentWinner?.bidderId.toString(),
                        outbidTransactionId,
                    }, session);
                }
                else {
                    const isAutoBidWinnerAlreadyWinning = currentWinner?.bidderId.toString() === engineResult.winningBidderId;
                    const previousHoldToRelease = isAutoBidWinnerAlreadyWinning
                        ? new decimal_js_1.default(currentWinner.amount.toString()).toNumber()
                        : 0;
                    const autoBidWinnerWallet = await this.walletService.getWalletByUserId(engineResult.winningBidderId);
                    const autoBidAvailable = new decimal_js_1.default(autoBidWinnerWallet.balance.toString())
                        .minus(autoBidWinnerWallet.heldBalance.toString())
                        .plus(previousHoldToRelease)
                        .toNumber();
                    if (autoBidAvailable < engineResult.winningAmount &&
                        engineResult.winningAutoBidId) {
                        await this.autoBidRepository.updateStatus(engineResult.winningAutoBidId, auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session);
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AutoBidExhausted, {
                            autoBidId: engineResult.winningAutoBidId,
                            auctionId: input.auctionId,
                            auctionTitle: auction.title,
                            userId: engineResult.winningBidderId,
                            maxAmount: engineResult.winningAmount,
                            currentPrice: input.amount,
                        }, session);
                        if (currentWinner) {
                            const { transaction } = await this.walletService.release(currentWinner.bidderId.toString(), Number(currentWinner.amount.toString()), input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                            outbidTransactionId = transaction._id.toString();
                            await this.bidRepository.updateStatus(currentWinner._id.toString(), bid_status_enum_1.BidStatus.OUTBID, session);
                        }
                        await this.walletService.hold(userId, input.amount, input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                        userBid = await this.bidRepository.create({
                            auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                            bidderId: new mongoose_1.Types.ObjectId(userId),
                            amount: input.amount,
                            status: bid_status_enum_1.BidStatus.WINNING,
                        }, session);
                        finalWinningBid = userBid;
                        await this.auctionRepository.updateCurrentPrice(input.auctionId, input.amount, session);
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.BidPlaced, {
                            bidId: userBid._id.toString(),
                            auctionId: input.auctionId,
                            auctionTitle: auction.title,
                            sellerId: auction.sellerId.toString(),
                            bidderId: userId,
                            amount: input.amount,
                            outbidUserId: currentWinner?.bidderId.toString(),
                            outbidTransactionId,
                        }, session);
                    }
                    else {
                        userBid = await this.bidRepository.create({
                            auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                            bidderId: new mongoose_1.Types.ObjectId(userId),
                            amount: input.amount,
                            status: bid_status_enum_1.BidStatus.OUTBID,
                        }, session);
                        if (currentWinner &&
                            currentWinner.bidderId.toString() !== engineResult.winningBidderId) {
                            const { transaction } = await this.walletService.release(currentWinner.bidderId.toString(), Number(currentWinner.amount.toString()), input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                            outbidTransactionId = transaction._id.toString();
                            await this.bidRepository.updateStatus(currentWinner._id.toString(), bid_status_enum_1.BidStatus.OUTBID, session);
                        }
                        else if (currentWinner &&
                            currentWinner.bidderId.toString() === engineResult.winningBidderId) {
                            await this.walletService.release(currentWinner.bidderId.toString(), Number(currentWinner.amount.toString()), input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                            await this.bidRepository.updateStatus(currentWinner._id.toString(), bid_status_enum_1.BidStatus.OUTBID, session);
                        }
                        await this.walletService.hold(engineResult.winningBidderId, engineResult.winningAmount, input.auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                        finalWinningBid = await this.bidRepository.create({
                            auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                            bidderId: new mongoose_1.Types.ObjectId(engineResult.winningBidderId),
                            amount: engineResult.winningAmount,
                            status: bid_status_enum_1.BidStatus.WINNING,
                        }, session);
                        await this.auctionRepository.updateCurrentPrice(input.auctionId, engineResult.winningAmount, session);
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.BidPlaced, {
                            bidId: finalWinningBid._id.toString(),
                            auctionId: input.auctionId,
                            auctionTitle: auction.title,
                            sellerId: auction.sellerId.toString(),
                            bidderId: engineResult.winningBidderId,
                            amount: engineResult.winningAmount,
                            outbidUserId: userId,
                            outbidTransactionId,
                        }, session);
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AutoBidPlaced, {
                            bidId: finalWinningBid._id.toString(),
                            auctionId: input.auctionId,
                            auctionTitle: auction.title,
                            bidderId: engineResult.winningBidderId,
                            amount: engineResult.winningAmount,
                            isAutoBid: true,
                        }, session);
                    }
                }
                await session.commitTransaction();
                void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
                this.bidRepository
                    .countByAuctionId(input.auctionId)
                    .then((bidCount) => {
                    void this.realtimeService.publishBidAdded({
                        bid: finalWinningBid,
                        currentPrice: Number(finalWinningBid.amount.toString()),
                        leadingBidderId: finalWinningBid.bidderId.toString(),
                        bidCount,
                    });
                })
                    .catch((err) => {
                    this.logger.error(`Failed to fetch bid count for publish: ${err.message}`);
                });
                return userBid;
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
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue)
                    .catch(() => undefined);
            }
        }
    }
    async finalizeEndedAuctions() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(FINALIZE_AUCTIONS_LOCK_KEY, lockValue, 'EX', FINALIZE_LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis finalize auctions lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const endedAuctions = await this.auctionRepository.findEndedWithoutWinner();
            if (endedAuctions.length === 0) {
                return;
            }
            this.logger.log(`Found ${endedAuctions.length} ended auctions to finalize`);
            for (const auction of endedAuctions) {
                const auctionId = auction._id.toString();
                const session = await this.bidRepository.startSession();
                session.startTransaction();
                try {
                    const winningBid = await this.bidRepository.findWinningByAuctionId(auctionId, session);
                    if (!winningBid) {
                        this.logger.log(`Auction ${auctionId} ended with no bids`);
                        await this.auctionRepository.finalizeAuction(auctionId, undefined, session);
                        await this.autoBidRepository.deactivateAllForAuction(auctionId, auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session);
                        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AuctionEnded, {
                            auctionId,
                            auctionTitle: auction.title ?? '',
                            sellerId: auction.sellerId.toString(),
                            finalPrice: Number((auction.currentPrice ?? 0).toString()),
                        }, session);
                        await session.commitTransaction();
                        void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
                        void this.realtimeService.publishAuctionStatusChanged({
                            auction: {
                                ...auction,
                                status: auction_status_enum_1.AuctionStatus.ENDED,
                                winnerId: undefined,
                                isFinalized: true,
                            },
                        });
                        continue;
                    }
                    const winnerId = winningBid.bidderId.toString();
                    const sellerId = auction.sellerId.toString();
                    const { transaction: captureTransaction } = await this.walletService.capture(winnerId, Number(winningBid.amount.toString()), auctionId, session, transaction_reference_type_enum_1.TransactionReferenceType.AUCTION);
                    const escrow = await this.escrowService.createEscrow({
                        auctionId,
                        buyerId: winnerId,
                        sellerId,
                        amount: Number(winningBid.amount.toString()),
                        currency: 'EGP',
                    }, session);
                    await this.auctionRepository.finalizeAuction(auctionId, winnerId, session);
                    await this.autoBidRepository.deactivateAllForAuction(auctionId, auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session);
                    await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.AuctionEnded, {
                        auctionId,
                        auctionTitle: auction.title ?? '',
                        sellerId,
                        finalPrice: Number((auction.currentPrice ?? winningBid.amount).toString()),
                        winnerId,
                        captureTransactionId: captureTransaction._id.toString(),
                        escrowId: escrow._id.toString(),
                    }, session);
                    await session.commitTransaction();
                    void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);
                    void this.realtimeService.publishAuctionStatusChanged({
                        auction: {
                            ...auction,
                            status: auction_status_enum_1.AuctionStatus.ENDED,
                            winnerId: winningBid.bidderId,
                            currentPrice: winningBid.amount,
                            isFinalized: true,
                        },
                    });
                    this.logger.log(`Successfully finalized auction ${auctionId}. Winner: ${winnerId}, Seller: ${sellerId}, Amount: ${winningBid.amount.toString()}`);
                }
                catch (error) {
                    await session.abortTransaction();
                    this.logger.error(`Failed to finalize auction ${auctionId}: ${error.message}`);
                }
                finally {
                    await session.endSession();
                }
            }
        }
        catch (err) {
            this.logger.error(`Failed to run finalizeEndedAuctions: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, FINALIZE_AUCTIONS_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
    async adminGetAllBids(input, filter) {
        const { items, total } = await this.bidRepository.findAll(input.page, input.limit, filter);
        const totalPages = Math.ceil(total / input.limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: input.page < totalPages,
        };
    }
    async getAuctionBids(auctionId, input, filter) {
        if (!mongoose_1.Types.ObjectId.isValid(auctionId)) {
            throw new invalid_auction_id_exception_1.InvalidAuctionIdException();
        }
        const { items, total } = await this.bidRepository.findByAuctionId(auctionId, input.page, input.limit, filter);
        const totalPages = Math.ceil(total / input.limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: input.page < totalPages,
        };
    }
    async getMyBids(userId, input, filter) {
        const { items, total } = await this.bidRepository.findByBidderId(userId, input.page, input.limit, filter);
        const totalPages = Math.ceil(total / input.limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: input.page < totalPages,
        };
    }
};
exports.BidsService = BidsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BidsService.prototype, "finalizeEndedAuctions", null);
exports.BidsService = BidsService = BidsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IBidRepository')),
    __param(1, (0, common_1.Inject)('IAutoBidRepository')),
    __param(2, (0, common_1.Inject)('IAuctionRepository')),
    __param(9, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, Object, Object, proxy_bidding_engine_service_1.ProxyBiddingEngineService,
        wallet_service_1.WalletService,
        services_1.EscrowService,
        realtime_service_1.RealtimeService,
        redis_service_1.RedisService,
        outbox_service_1.OutboxService,
        ioredis_2.default])
], BidsService);
//# sourceMappingURL=bids.service.js.map