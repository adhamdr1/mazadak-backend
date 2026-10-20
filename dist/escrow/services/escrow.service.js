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
var EscrowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowService = exports.INSPECTION_WINDOW_DAYS = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const decimal_js_1 = __importDefault(require("decimal.js"));
const enums_1 = require("../enums");
const wallet_service_1 = require("../../wallet/wallet.service");
const outbox_service_1 = require("../../infrastructure/outbox/outbox.service");
const realtime_service_1 = require("../../infrastructure/pubsub/realtime.service");
const rabbitmq_event_types_1 = require("../../infrastructure/rabbitmq/rabbitmq-event.types");
const transaction_reference_type_enum_1 = require("../../transaction/enums/transaction-reference-type.enum");
const exceptions_1 = require("../exceptions");
exports.INSPECTION_WINDOW_DAYS = 7;
let EscrowService = EscrowService_1 = class EscrowService {
    escrowRepository;
    walletService;
    outboxService;
    realtimeService;
    connection;
    logger = new common_1.Logger(EscrowService_1.name);
    constructor(escrowRepository, walletService, outboxService, realtimeService, connection) {
        this.escrowRepository = escrowRepository;
        this.walletService = walletService;
        this.outboxService = outboxService;
        this.realtimeService = realtimeService;
        this.connection = connection;
    }
    async createEscrow(params, session) {
        const existingEscrow = await this.escrowRepository.findByAuctionId(params.auctionId, session);
        if (existingEscrow) {
            this.logger.warn(`Escrow already exists for auction ${params.auctionId}`);
            return existingEscrow;
        }
        const inspectionPeriodEndsAt = new Date(Date.now() + exports.INSPECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const decimalAmount = mongoose_1.Types.Decimal128.fromString(new decimal_js_1.default(params.amount).toString());
        const escrow = await this.escrowRepository.create({
            auctionId: new mongoose_1.Types.ObjectId(params.auctionId),
            buyerId: new mongoose_1.Types.ObjectId(params.buyerId),
            sellerId: new mongoose_1.Types.ObjectId(params.sellerId),
            amount: decimalAmount,
            currency: params.currency ?? 'EGP',
            inspectionPeriodEndsAt,
        }, session);
        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.EscrowCreated, {
            escrowId: escrow._id.toString(),
            auctionId: params.auctionId,
            buyerId: params.buyerId,
            sellerId: params.sellerId,
            amount: params.amount,
            currency: params.currency ?? 'EGP',
            inspectionPeriodEndsAt: inspectionPeriodEndsAt.toISOString(),
        }, session);
        this.logger.log(`Escrow created for auction ${params.auctionId}. Amount: ${params.amount}, Inspection ends: ${inspectionPeriodEndsAt.toISOString()}`);
        return escrow;
    }
    async confirmDelivery(buyerId, escrowId) {
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const escrow = await this.escrowRepository.findById(escrowId, session);
            if (!escrow) {
                throw new exceptions_1.EscrowNotFoundException();
            }
            if (escrow.buyerId.toString() !== buyerId) {
                throw new exceptions_1.EscrowUnauthorizedException();
            }
            if (escrow.status === enums_1.EscrowStatus.RELEASED) {
                throw new exceptions_1.EscrowAlreadyReleasedException();
            }
            if (escrow.status === enums_1.EscrowStatus.DISPUTED) {
                throw new exceptions_1.EscrowAlreadyDisputedException();
            }
            if (escrow.status !== enums_1.EscrowStatus.HELD) {
                throw new exceptions_1.InvalidEscrowActionException();
            }
            const amountNumber = Number(escrow.amount.toString());
            const sellerId = escrow.sellerId.toString();
            const auctionId = escrow.auctionId.toString();
            await this.walletService.deposit(sellerId, amountNumber, auctionId, session, escrow.currency, transaction_reference_type_enum_1.TransactionReferenceType.ESCROW);
            const updatedEscrow = await this.escrowRepository.updateStatus(escrowId, enums_1.EscrowStatus.RELEASED, {
                releasedAt: new Date(),
                releaseReason: 'BUYER_CONFIRMED',
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.EscrowReleased, {
                escrowId: escrow._id.toString(),
                auctionId,
                buyerId,
                sellerId,
                amount: amountNumber,
                releaseReason: 'BUYER_CONFIRMED',
            }, session);
            await session.commitTransaction();
            this.logger.log(`Escrow ${escrowId} released via buyer confirmation. Amount: ${amountNumber} credited to seller ${sellerId}`);
            void this.realtimeService.publishEscrowStatusChanged({
                escrowId: updatedEscrow._id.toString(),
                auctionId,
                buyerId,
                sellerId,
                status: enums_1.EscrowStatus.RELEASED,
                releasedAt: updatedEscrow.releasedAt,
                releaseReason: 'BUYER_CONFIRMED',
            });
            return updatedEscrow;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Failed to confirm delivery for escrow ${escrowId}: ${error.message}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async releaseEscrow(escrowId, releaseReason, session, referenceType = transaction_reference_type_enum_1.TransactionReferenceType.ESCROW, referenceId) {
        const escrow = await this.escrowRepository.findById(escrowId, session);
        if (!escrow) {
            throw new exceptions_1.EscrowNotFoundException();
        }
        if (escrow.status === enums_1.EscrowStatus.RELEASED) {
            throw new exceptions_1.EscrowAlreadyReleasedException();
        }
        if (escrow.status === enums_1.EscrowStatus.REFUNDED) {
            throw new exceptions_1.EscrowAlreadyRefundedException();
        }
        if (escrow.status === enums_1.EscrowStatus.DISPUTED &&
            referenceType !== transaction_reference_type_enum_1.TransactionReferenceType.DISPUTE) {
            throw new exceptions_1.EscrowAlreadyDisputedException();
        }
        const amountNumber = Number(escrow.amount.toString());
        const sellerId = escrow.sellerId.toString();
        const auctionId = escrow.auctionId.toString();
        const buyerId = escrow.buyerId.toString();
        await this.walletService.deposit(sellerId, amountNumber, referenceId ?? auctionId, session, escrow.currency, referenceType);
        const updatedEscrow = await this.escrowRepository.updateStatus(escrowId, enums_1.EscrowStatus.RELEASED, {
            releasedAt: new Date(),
            releaseReason,
        }, session);
        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.EscrowReleased, {
            escrowId: escrow._id.toString(),
            auctionId,
            buyerId,
            sellerId,
            amount: amountNumber,
            releaseReason,
        }, session);
        this.logger.log(`Escrow ${escrowId} released. Reason: ${releaseReason}, Amount: ${amountNumber} credited to seller ${sellerId}`);
        void this.realtimeService.publishEscrowStatusChanged({
            escrowId: updatedEscrow._id.toString(),
            auctionId,
            buyerId,
            sellerId,
            status: enums_1.EscrowStatus.RELEASED,
            releasedAt: updatedEscrow.releasedAt,
            releaseReason,
        });
        return updatedEscrow;
    }
    async refundEscrow(escrowId, refundReason, session, referenceType = transaction_reference_type_enum_1.TransactionReferenceType.ESCROW, referenceId) {
        const escrow = await this.escrowRepository.findById(escrowId, session);
        if (!escrow) {
            throw new exceptions_1.EscrowNotFoundException();
        }
        if (escrow.status === enums_1.EscrowStatus.REFUNDED) {
            throw new exceptions_1.EscrowAlreadyRefundedException();
        }
        if (escrow.status === enums_1.EscrowStatus.RELEASED) {
            throw new exceptions_1.EscrowAlreadyReleasedException();
        }
        if (escrow.status === enums_1.EscrowStatus.DISPUTED &&
            referenceType !== transaction_reference_type_enum_1.TransactionReferenceType.DISPUTE) {
            throw new exceptions_1.EscrowAlreadyDisputedException();
        }
        const amountNumber = Number(escrow.amount.toString());
        const buyerId = escrow.buyerId.toString();
        const auctionId = escrow.auctionId.toString();
        const sellerId = escrow.sellerId.toString();
        await this.walletService.deposit(buyerId, amountNumber, referenceId ?? auctionId, session, escrow.currency, referenceType);
        const updatedEscrow = await this.escrowRepository.updateStatus(escrowId, enums_1.EscrowStatus.REFUNDED, {
            refundedAt: new Date(),
            releaseReason: refundReason,
        }, session);
        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.EscrowRefunded, {
            escrowId: escrow._id.toString(),
            auctionId,
            buyerId,
            sellerId,
            amount: amountNumber,
            refundReason,
        }, session);
        this.logger.log(`Escrow ${escrowId} refunded to buyer ${buyerId}. Reason: ${refundReason}, Amount: ${amountNumber}`);
        void this.realtimeService.publishEscrowStatusChanged({
            escrowId: updatedEscrow._id.toString(),
            auctionId,
            buyerId,
            sellerId,
            status: enums_1.EscrowStatus.REFUNDED,
            refundedAt: updatedEscrow.refundedAt,
            releaseReason: refundReason,
        });
        return updatedEscrow;
    }
    async getEscrowById(id) {
        const escrow = await this.escrowRepository.findById(id);
        if (!escrow) {
            throw new exceptions_1.EscrowNotFoundException();
        }
        return escrow;
    }
    async getEscrowByAuctionId(auctionId) {
        return this.escrowRepository.findByAuctionId(auctionId);
    }
    async getMyEscrows(userId, input, filter) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        const mergedFilter = {
            ...filter,
            userId,
        };
        const { items, total } = await this.escrowRepository.findPaginated(mergedFilter, page, limit);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async getAllEscrows(input, filter) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        const { items, total } = await this.escrowRepository.findPaginated(filter, page, limit);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async releaseExpiredHeldEscrows(limit = 50) {
        const expiredEscrows = await this.escrowRepository.findExpiredHeldEscrows(new Date(), limit);
        let releasedCount = 0;
        for (const escrow of expiredEscrows) {
            try {
                const session = await this.connection.startSession();
                try {
                    session.startTransaction();
                    await this.releaseEscrow(escrow._id.toString(), 'EXPIRED_INSPECTION_WINDOW', session);
                    await session.commitTransaction();
                    releasedCount++;
                }
                catch (err) {
                    await session.abortTransaction();
                    this.logger.error(`Failed to auto-release expired escrow ${escrow._id.toString()}: ${err.message}`);
                }
                finally {
                    await session.endSession();
                }
            }
            catch (err) {
                this.logger.error(`Session error on auto-releasing escrow ${escrow._id.toString()}: ${err.message}`);
            }
        }
        return releasedCount;
    }
    async sumHeldEscrows() {
        return this.escrowRepository.sumHeldEscrows();
    }
};
exports.EscrowService = EscrowService;
exports.EscrowService = EscrowService = EscrowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IEscrowRepository')),
    __param(4, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [Object, wallet_service_1.WalletService,
        outbox_service_1.OutboxService,
        realtime_service_1.RealtimeService,
        mongoose_1.Connection])
], EscrowService);
//# sourceMappingURL=escrow.service.js.map