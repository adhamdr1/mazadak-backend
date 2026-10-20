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
var DisputesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const enums_1 = require("../enums");
const escrow_service_1 = require("./escrow.service");
const transaction_reference_type_enum_1 = require("../../transaction/enums/transaction-reference-type.enum");
const outbox_service_1 = require("../../infrastructure/outbox/outbox.service");
const realtime_service_1 = require("../../infrastructure/pubsub/realtime.service");
const rabbitmq_event_types_1 = require("../../infrastructure/rabbitmq/rabbitmq-event.types");
const exceptions_1 = require("../exceptions");
let DisputesService = DisputesService_1 = class DisputesService {
    disputeRepository;
    escrowRepository;
    escrowService;
    outboxService;
    realtimeService;
    connection;
    logger = new common_1.Logger(DisputesService_1.name);
    constructor(disputeRepository, escrowRepository, escrowService, outboxService, realtimeService, connection) {
        this.disputeRepository = disputeRepository;
        this.escrowRepository = escrowRepository;
        this.escrowService = escrowService;
        this.outboxService = outboxService;
        this.realtimeService = realtimeService;
        this.connection = connection;
    }
    async openDispute(userId, input) {
        const escrow = await this.escrowRepository.findByAuctionId(input.auctionId);
        if (!escrow) {
            throw new exceptions_1.EscrowNotFoundException();
        }
        const isBuyer = escrow.buyerId.toString() === userId;
        const isSeller = escrow.sellerId.toString() === userId;
        if (!isBuyer && !isSeller) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        if (escrow.status === enums_1.EscrowStatus.RELEASED) {
            throw new exceptions_1.EscrowAlreadyReleasedException();
        }
        if (escrow.status === enums_1.EscrowStatus.DISPUTED) {
            throw new exceptions_1.EscrowAlreadyDisputedException();
        }
        if (escrow.status !== enums_1.EscrowStatus.HELD) {
            throw new exceptions_1.InvalidDisputeActionException(`Cannot open dispute for escrow with status ${escrow.status}`);
        }
        if (new Date() > new Date(escrow.inspectionPeriodEndsAt)) {
            throw new exceptions_1.DisputeWindowExpiredException();
        }
        const againstUserId = isBuyer
            ? escrow.sellerId.toString()
            : escrow.buyerId.toString();
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const dispute = await this.disputeRepository.create({
                escrowId: new mongoose_1.Types.ObjectId(escrow._id.toString()),
                auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                openedById: new mongoose_1.Types.ObjectId(userId),
                againstUserId: new mongoose_1.Types.ObjectId(againstUserId),
                reason: input.reason,
                description: input.description,
                evidenceUrls: input.evidenceUrls ?? [],
            }, session);
            await this.escrowRepository.updateStatus(escrow._id.toString(), enums_1.EscrowStatus.DISPUTED, {
                disputeId: new mongoose_1.Types.ObjectId(dispute._id.toString()),
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.DisputeOpened, {
                disputeId: dispute._id.toString(),
                escrowId: escrow._id.toString(),
                auctionId: input.auctionId,
                openedById: userId,
                againstUserId,
                reason: input.reason,
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.EscrowDisputed, {
                escrowId: escrow._id.toString(),
                auctionId: input.auctionId,
                disputeId: dispute._id.toString(),
                openedById: userId,
            }, session);
            await session.commitTransaction();
            this.logger.log(`Dispute ${dispute._id.toString()} opened by ${userId} for escrow ${escrow._id.toString()}`);
            void this.realtimeService.publishDisputeStatusChanged({
                disputeId: dispute._id.toString(),
                escrowId: escrow._id.toString(),
                auctionId: input.auctionId,
                openedById: userId,
                againstUserId,
                status: enums_1.DisputeStatus.OPEN,
            });
            void this.realtimeService.publishEscrowStatusChanged({
                escrowId: escrow._id.toString(),
                auctionId: input.auctionId,
                buyerId: escrow.buyerId.toString(),
                sellerId: escrow.sellerId.toString(),
                status: enums_1.EscrowStatus.DISPUTED,
                disputeId: dispute._id.toString(),
            });
            return dispute;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Failed to open dispute for auction ${input.auctionId}: ${error.message}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async cancelDispute(userId, disputeId) {
        const dispute = await this.disputeRepository.findById(disputeId);
        if (!dispute) {
            throw new exceptions_1.DisputeNotFoundException();
        }
        if (dispute.openedById.toString() !== userId) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        if (dispute.status === enums_1.DisputeStatus.RESOLVED_BUYER_REFUNDED ||
            dispute.status === enums_1.DisputeStatus.RESOLVED_SELLER_PAID ||
            dispute.status === enums_1.DisputeStatus.CANCELLED) {
            throw new exceptions_1.DisputeAlreadyResolvedException();
        }
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const updatedDispute = await this.disputeRepository.updateStatus(disputeId, enums_1.DisputeStatus.CANCELLED, undefined, session);
            await this.escrowRepository.updateStatus(dispute.escrowId.toString(), enums_1.EscrowStatus.HELD, undefined, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.DisputeCancelled, {
                disputeId,
                escrowId: dispute.escrowId.toString(),
                auctionId: dispute.auctionId.toString(),
                openedById: dispute.openedById.toString(),
                againstUserId: dispute.againstUserId.toString(),
                cancelledById: userId,
            }, session);
            await session.commitTransaction();
            this.logger.log(`Dispute ${disputeId} cancelled by user ${userId}. Escrow restored to HELD`);
            void this.realtimeService.publishDisputeStatusChanged({
                disputeId,
                escrowId: dispute.escrowId.toString(),
                auctionId: dispute.auctionId.toString(),
                openedById: dispute.openedById.toString(),
                againstUserId: dispute.againstUserId.toString(),
                status: enums_1.DisputeStatus.CANCELLED,
            });
            void this.realtimeService.publishEscrowStatusChanged({
                escrowId: dispute.escrowId.toString(),
                auctionId: dispute.auctionId.toString(),
                buyerId: dispute.openedById.toString(),
                sellerId: dispute.againstUserId.toString(),
                status: enums_1.EscrowStatus.HELD,
            });
            return updatedDispute;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Failed to cancel dispute ${disputeId}: ${error.message}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async updateDisputeStatus(input) {
        const dispute = await this.disputeRepository.findById(input.disputeId);
        if (!dispute) {
            throw new exceptions_1.DisputeNotFoundException();
        }
        if (dispute.status === enums_1.DisputeStatus.RESOLVED_BUYER_REFUNDED ||
            dispute.status === enums_1.DisputeStatus.RESOLVED_SELLER_PAID ||
            dispute.status === enums_1.DisputeStatus.CANCELLED) {
            throw new exceptions_1.DisputeAlreadyResolvedException();
        }
        const updated = await this.disputeRepository.updateStatus(input.disputeId, input.status);
        void this.realtimeService.publishDisputeStatusChanged({
            disputeId: updated._id.toString(),
            escrowId: dispute.escrowId.toString(),
            auctionId: dispute.auctionId.toString(),
            openedById: dispute.openedById.toString(),
            againstUserId: dispute.againstUserId.toString(),
            status: input.status,
        });
        return updated;
    }
    async resolveDispute(adminId, input) {
        const dispute = await this.disputeRepository.findById(input.disputeId);
        if (!dispute) {
            throw new exceptions_1.DisputeNotFoundException();
        }
        if (dispute.status === enums_1.DisputeStatus.RESOLVED_BUYER_REFUNDED ||
            dispute.status === enums_1.DisputeStatus.RESOLVED_SELLER_PAID ||
            dispute.status === enums_1.DisputeStatus.CANCELLED) {
            throw new exceptions_1.DisputeAlreadyResolvedException();
        }
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const newDisputeStatus = input.decision === enums_1.DisputeResolution.REFUND_BUYER
                ? enums_1.DisputeStatus.RESOLVED_BUYER_REFUNDED
                : enums_1.DisputeStatus.RESOLVED_SELLER_PAID;
            if (input.decision === enums_1.DisputeResolution.REFUND_BUYER) {
                await this.escrowService.refundEscrow(dispute.escrowId.toString(), `ADMIN_RESOLVED_DISPUTE: ${input.adminNotes ?? 'Refund Buyer'}`, session, transaction_reference_type_enum_1.TransactionReferenceType.DISPUTE, dispute._id.toString());
            }
            else {
                await this.escrowService.releaseEscrow(dispute.escrowId.toString(), `ADMIN_RESOLVED_DISPUTE: ${input.adminNotes ?? 'Pay Seller'}`, session, transaction_reference_type_enum_1.TransactionReferenceType.DISPUTE, dispute._id.toString());
            }
            const updatedDispute = await this.disputeRepository.updateStatus(input.disputeId, newDisputeStatus, {
                adminId: new mongoose_1.Types.ObjectId(adminId),
                adminDecision: input.decision,
                adminNotes: input.adminNotes,
                resolvedAt: new Date(),
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.DisputeResolved, {
                disputeId: input.disputeId,
                escrowId: dispute.escrowId.toString(),
                auctionId: dispute.auctionId.toString(),
                openedById: dispute.openedById.toString(),
                againstUserId: dispute.againstUserId.toString(),
                adminId,
                decision: input.decision,
                adminNotes: input.adminNotes,
            }, session);
            await session.commitTransaction();
            this.logger.log(`Dispute ${input.disputeId} resolved by admin ${adminId} with decision: ${input.decision}`);
            void this.realtimeService.publishDisputeStatusChanged({
                disputeId: input.disputeId,
                escrowId: dispute.escrowId.toString(),
                auctionId: dispute.auctionId.toString(),
                openedById: dispute.openedById.toString(),
                againstUserId: dispute.againstUserId.toString(),
                status: newDisputeStatus,
                adminDecision: input.decision,
                adminNotes: input.adminNotes,
                resolvedAt: updatedDispute.resolvedAt,
            });
            return updatedDispute;
        }
        catch (error) {
            await session.abortTransaction();
            this.logger.error(`Failed to resolve dispute ${input.disputeId}: ${error.message}`);
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async getDisputeById(id) {
        const dispute = await this.disputeRepository.findById(id);
        if (!dispute) {
            throw new exceptions_1.DisputeNotFoundException();
        }
        return dispute;
    }
    async getDisputeByEscrowId(escrowId) {
        return this.disputeRepository.findByEscrowId(escrowId);
    }
    async getDisputeByAuctionId(auctionId) {
        return this.disputeRepository.findByAuctionId(auctionId);
    }
    async getMyDisputes(userId, input, filter) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        const mergedFilter = {
            ...filter,
            userId,
        };
        const { items, total } = await this.disputeRepository.findPaginated(mergedFilter, page, limit);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async getAllDisputes(input, filter) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        const { items, total } = await this.disputeRepository.findPaginated(filter, page, limit);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = DisputesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IDisputeRepository')),
    __param(1, (0, common_1.Inject)('IEscrowRepository')),
    __param(5, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [Object, Object, escrow_service_1.EscrowService,
        outbox_service_1.OutboxService,
        realtime_service_1.RealtimeService,
        mongoose_1.Connection])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map