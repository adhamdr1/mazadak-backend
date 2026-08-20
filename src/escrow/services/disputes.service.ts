import { Injectable, Inject, Logger } from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import type { IDisputeRepository, IEscrowRepository } from '../interfaces';
import { Dispute } from '../entities';
import { DisputeStatus, DisputeResolution, EscrowStatus } from '../enums';
import {
  CreateDisputeInput,
  ResolveDisputeInput,
  UpdateDisputeStatusInput,
  DisputeFilterInput,
  DisputesPage,
} from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { EscrowService } from './escrow.service';
import { TransactionReferenceType } from '../../transaction/enums/transaction-reference-type.enum';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import {
  DisputeNotFoundException,
  DisputeAlreadyResolvedException,
  DisputeWindowExpiredException,
  InvalidDisputeActionException,
  EscrowNotFoundException,
  EscrowAlreadyReleasedException,
  EscrowAlreadyDisputedException,
  EscrowUnauthorizedException,
} from '../exceptions';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @Inject('IDisputeRepository')
    private readonly disputeRepository: IDisputeRepository,
    @Inject('IEscrowRepository')
    private readonly escrowRepository: IEscrowRepository,
    private readonly escrowService: EscrowService,
    private readonly outboxService: OutboxService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Opens a dispute for an escrow hold within the 7-day inspection window.
   */
  async openDispute(
    userId: string,
    input: CreateDisputeInput,
  ): Promise<Dispute> {
    const escrow = await this.escrowRepository.findByAuctionId(input.auctionId);
    if (!escrow) {
      throw new EscrowNotFoundException();
    }

    const isBuyer = escrow.buyerId.toString() === userId;
    const isSeller = escrow.sellerId.toString() === userId;

    if (!isBuyer && !isSeller) {
      throw new EscrowUnauthorizedException();
    }

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new EscrowAlreadyReleasedException();
    }

    if (escrow.status === EscrowStatus.DISPUTED) {
      throw new EscrowAlreadyDisputedException();
    }

    if (escrow.status !== EscrowStatus.HELD) {
      throw new InvalidDisputeActionException(
        `Cannot open dispute for escrow with status ${escrow.status}`,
      );
    }

    // Check inspection window expiration
    if (new Date() > new Date(escrow.inspectionPeriodEndsAt)) {
      throw new DisputeWindowExpiredException();
    }

    const againstUserId = isBuyer
      ? escrow.sellerId.toString()
      : escrow.buyerId.toString();

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // 1. Create dispute
      const dispute = await this.disputeRepository.create(
        {
          escrowId: new Types.ObjectId(escrow._id.toString()),
          auctionId: new Types.ObjectId(input.auctionId),
          openedById: new Types.ObjectId(userId),
          againstUserId: new Types.ObjectId(againstUserId),
          reason: input.reason,
          description: input.description,
          evidenceUrls: input.evidenceUrls ?? [],
        },
        session,
      );

      // 2. Put escrow on DISPUTED hold
      await this.escrowRepository.updateStatus(
        escrow._id.toString(),
        EscrowStatus.DISPUTED,
        {
          disputeId: new Types.ObjectId(dispute._id.toString()),
        },
        session,
      );

      // 3. Outbox events
      await this.outboxService.saveEvent(
        RabbitMQEvent.DisputeOpened,
        {
          disputeId: dispute._id.toString(),
          escrowId: escrow._id.toString(),
          auctionId: input.auctionId,
          openedById: userId,
          againstUserId,
          reason: input.reason,
        },
        session,
      );

      await this.outboxService.saveEvent(
        RabbitMQEvent.EscrowDisputed,
        {
          escrowId: escrow._id.toString(),
          auctionId: input.auctionId,
          disputeId: dispute._id.toString(),
          openedById: userId,
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Dispute ${dispute._id.toString()} opened by ${userId} for escrow ${escrow._id.toString()}`,
      );

      return dispute;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to open dispute for auction ${input.auctionId}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Allows the user who opened the dispute to cancel it before resolution.
   */
  async cancelDispute(userId: string, disputeId: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException();
    }

    if (dispute.openedById.toString() !== userId) {
      throw new EscrowUnauthorizedException();
    }

    if (
      dispute.status === DisputeStatus.RESOLVED_BUYER_REFUNDED ||
      dispute.status === DisputeStatus.RESOLVED_SELLER_PAID ||
      dispute.status === DisputeStatus.CANCELLED
    ) {
      throw new DisputeAlreadyResolvedException();
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // 1. Update dispute status to CANCELLED
      const updatedDispute = await this.disputeRepository.updateStatus(
        disputeId,
        DisputeStatus.CANCELLED,
        undefined,
        session,
      );

      // 2. Return escrow back to HELD
      await this.escrowRepository.updateStatus(
        dispute.escrowId.toString(),
        EscrowStatus.HELD,
        undefined,
        session,
      );

      // 3. Outbox event
      await this.outboxService.saveEvent(
        RabbitMQEvent.DisputeCancelled,
        {
          disputeId,
          escrowId: dispute.escrowId.toString(),
          auctionId: dispute.auctionId.toString(),
          openedById: dispute.openedById.toString(),
          againstUserId: dispute.againstUserId.toString(),
          cancelledById: userId,
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Dispute ${disputeId} cancelled by user ${userId}. Escrow restored to HELD`,
      );

      return updatedDispute!;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to cancel dispute ${disputeId}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Admin updates dispute status to UNDER_REVIEW.
   */
  async updateDisputeStatus(input: UpdateDisputeStatusInput): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(input.disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException();
    }

    if (
      dispute.status === DisputeStatus.RESOLVED_BUYER_REFUNDED ||
      dispute.status === DisputeStatus.RESOLVED_SELLER_PAID ||
      dispute.status === DisputeStatus.CANCELLED
    ) {
      throw new DisputeAlreadyResolvedException();
    }

    const updated = await this.disputeRepository.updateStatus(
      input.disputeId,
      input.status,
    );

    return updated!;
  }

  /**
   * Admin resolves the dispute (Refund Buyer OR Pay Seller).
   */
  async resolveDispute(
    adminId: string,
    input: ResolveDisputeInput,
  ): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(input.disputeId);
    if (!dispute) {
      throw new DisputeNotFoundException();
    }

    if (
      dispute.status === DisputeStatus.RESOLVED_BUYER_REFUNDED ||
      dispute.status === DisputeStatus.RESOLVED_SELLER_PAID ||
      dispute.status === DisputeStatus.CANCELLED
    ) {
      throw new DisputeAlreadyResolvedException();
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const newDisputeStatus =
        input.decision === DisputeResolution.REFUND_BUYER
          ? DisputeStatus.RESOLVED_BUYER_REFUNDED
          : DisputeStatus.RESOLVED_SELLER_PAID;

      // 1. Process financial escrow resolution
      if (input.decision === DisputeResolution.REFUND_BUYER) {
        await this.escrowService.refundEscrow(
          dispute.escrowId.toString(),
          `ADMIN_RESOLVED_DISPUTE: ${input.adminNotes ?? 'Refund Buyer'}`,
          session,
          TransactionReferenceType.DISPUTE,
          dispute._id.toString(),
        );
      } else {
        await this.escrowService.releaseEscrow(
          dispute.escrowId.toString(),
          `ADMIN_RESOLVED_DISPUTE: ${input.adminNotes ?? 'Pay Seller'}`,
          session,
          TransactionReferenceType.DISPUTE,
          dispute._id.toString(),
        );
      }

      // 2. Update dispute document
      const updatedDispute = await this.disputeRepository.updateStatus(
        input.disputeId,
        newDisputeStatus,
        {
          adminId: new Types.ObjectId(adminId),
          adminDecision: input.decision,
          adminNotes: input.adminNotes,
          resolvedAt: new Date(),
        },
        session,
      );

      // 3. Outbox event
      await this.outboxService.saveEvent(
        RabbitMQEvent.DisputeResolved,
        {
          disputeId: input.disputeId,
          escrowId: dispute.escrowId.toString(),
          auctionId: dispute.auctionId.toString(),
          openedById: dispute.openedById.toString(),
          againstUserId: dispute.againstUserId.toString(),
          adminId,
          decision: input.decision,
          adminNotes: input.adminNotes,
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Dispute ${input.disputeId} resolved by admin ${adminId} with decision: ${input.decision}`,
      );

      return updatedDispute!;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to resolve dispute ${input.disputeId}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Retrieves dispute by ID.
   */
  async getDisputeById(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(id);
    if (!dispute) {
      throw new DisputeNotFoundException();
    }
    return dispute;
  }

  /**
   * Retrieves dispute by Escrow ID.
   */
  async getDisputeByEscrowId(escrowId: string): Promise<Dispute | null> {
    return this.disputeRepository.findByEscrowId(escrowId);
  }

  /**
   * Retrieves dispute by Auction ID.
   */
  async getDisputeByAuctionId(auctionId: string): Promise<Dispute | null> {
    return this.disputeRepository.findByAuctionId(auctionId);
  }

  /**
   * Retrieves paginated disputes where user is either plaintiff or defendant.
   */
  async getMyDisputes(
    userId: string,
    input?: PaginationInput,
    filter?: DisputeFilterInput,
  ): Promise<DisputesPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const mergedFilter: DisputeFilterInput = {
      ...filter,
      userId,
    };

    const { items, total } = await this.disputeRepository.findPaginated(
      mergedFilter,
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Admin: Retrieves all disputes paginated with filters.
   */
  async getAllDisputes(
    input?: PaginationInput,
    filter?: DisputeFilterInput,
  ): Promise<DisputesPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const { items, total } = await this.disputeRepository.findPaginated(
      filter,
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
}
