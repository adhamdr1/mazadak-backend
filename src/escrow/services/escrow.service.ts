import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientSession, Connection, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import Decimal from 'decimal.js';
import type { IEscrowRepository } from '../interfaces';
import { Escrow } from '../entities';
import { EscrowStatus } from '../enums';
import { EscrowFilterInput, EscrowsPage } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { WalletService } from '../../wallet/wallet.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import { TransactionReferenceType } from '../../transaction/enums/transaction-reference-type.enum';
import {
  EscrowNotFoundException,
  EscrowAlreadyReleasedException,
  EscrowAlreadyRefundedException,
  EscrowAlreadyDisputedException,
  EscrowUnauthorizedException,
} from '../exceptions';

export const INSPECTION_WINDOW_DAYS = 7;

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @Inject('IEscrowRepository')
    private readonly escrowRepository: IEscrowRepository,
    private readonly walletService: WalletService,
    private readonly outboxService: OutboxService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Creates an escrow hold for a completed auction with a 7-day inspection window.
   */
  async createEscrow(
    params: {
      auctionId: string;
      buyerId: string;
      sellerId: string;
      amount: number;
      currency?: string;
    },
    session?: ClientSession,
  ): Promise<Escrow> {
    const existingEscrow = await this.escrowRepository.findByAuctionId(
      params.auctionId,
      session,
    );
    if (existingEscrow) {
      this.logger.warn(`Escrow already exists for auction ${params.auctionId}`);
      return existingEscrow;
    }

    const inspectionPeriodEndsAt = new Date(
      Date.now() + INSPECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(params.amount).toString(),
    );

    const escrow = await this.escrowRepository.create(
      {
        auctionId: new Types.ObjectId(params.auctionId),
        buyerId: new Types.ObjectId(params.buyerId),
        sellerId: new Types.ObjectId(params.sellerId),
        amount: decimalAmount,
        currency: params.currency ?? 'EGP',
        inspectionPeriodEndsAt,
      },
      session,
    );

    await this.outboxService.saveEvent(
      RabbitMQEvent.EscrowCreated,
      {
        escrowId: escrow._id.toString(),
        auctionId: params.auctionId,
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        amount: params.amount,
        currency: params.currency ?? 'EGP',
        inspectionPeriodEndsAt: inspectionPeriodEndsAt.toISOString(),
      },
      session,
    );

    this.logger.log(
      `Escrow created for auction ${params.auctionId}. Amount: ${params.amount}, Inspection ends: ${inspectionPeriodEndsAt.toISOString()}`,
    );

    return escrow;
  }

  /**
   * Buyer confirms receipt of the product. Escrow is released to the seller immediately.
   */
  async confirmDelivery(buyerId: string, escrowId: string): Promise<Escrow> {
    const escrow = await this.escrowRepository.findById(escrowId);
    if (!escrow) {
      throw new EscrowNotFoundException();
    }

    if (escrow.buyerId.toString() !== buyerId) {
      throw new EscrowUnauthorizedException();
    }

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new EscrowAlreadyReleasedException();
    }

    if (escrow.status === EscrowStatus.DISPUTED) {
      throw new EscrowAlreadyDisputedException();
    }

    if (escrow.status !== EscrowStatus.HELD) {
      throw new Error(
        `Cannot confirm delivery for escrow in status ${escrow.status}`,
      );
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const amountNumber = Number(escrow.amount.toString());
      const sellerId = escrow.sellerId.toString();
      const auctionId = escrow.auctionId.toString();

      // 1. Deposit funds to the seller's wallet
      await this.walletService.deposit(
        sellerId,
        amountNumber,
        auctionId,
        session,
        escrow.currency,
        TransactionReferenceType.ESCROW,
      );

      // 2. Update escrow status to RELEASED
      const updatedEscrow = await this.escrowRepository.updateStatus(
        escrowId,
        EscrowStatus.RELEASED,
        {
          releasedAt: new Date(),
          releaseReason: 'BUYER_CONFIRMED',
        },
        session,
      );

      // 3. Outbox event
      await this.outboxService.saveEvent(
        RabbitMQEvent.EscrowReleased,
        {
          escrowId: escrow._id.toString(),
          auctionId,
          buyerId,
          sellerId,
          amount: amountNumber,
          releaseReason: 'BUYER_CONFIRMED',
        },
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Escrow ${escrowId} released via buyer confirmation. Amount: ${amountNumber} credited to seller ${sellerId}`,
      );

      return updatedEscrow!;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to confirm delivery for escrow ${escrowId}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Releases an escrow to the seller (e.g., auto-release upon window expiration or admin resolution).
   */
  async releaseEscrow(
    escrowId: string,
    releaseReason: string,
    session?: ClientSession,
    referenceType: TransactionReferenceType = TransactionReferenceType.ESCROW,
    referenceId?: string,
  ): Promise<Escrow> {
    const escrow = await this.escrowRepository.findById(escrowId, session);
    if (!escrow) {
      throw new EscrowNotFoundException();
    }

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new EscrowAlreadyReleasedException();
    }

    if (escrow.status === EscrowStatus.REFUNDED) {
      throw new EscrowAlreadyRefundedException();
    }

    if (
      escrow.status === EscrowStatus.DISPUTED &&
      referenceType !== TransactionReferenceType.DISPUTE
    ) {
      throw new EscrowAlreadyDisputedException();
    }

    const amountNumber = Number(escrow.amount.toString());
    const sellerId = escrow.sellerId.toString();
    const auctionId = escrow.auctionId.toString();
    const buyerId = escrow.buyerId.toString();

    // 1. Credit seller wallet
    await this.walletService.deposit(
      sellerId,
      amountNumber,
      referenceId ?? auctionId,
      session,
      escrow.currency,
      referenceType,
    );

    // 2. Update status to RELEASED
    const updatedEscrow = await this.escrowRepository.updateStatus(
      escrowId,
      EscrowStatus.RELEASED,
      {
        releasedAt: new Date(),
        releaseReason,
      },
      session,
    );

    // 3. Outbox event
    await this.outboxService.saveEvent(
      RabbitMQEvent.EscrowReleased,
      {
        escrowId: escrow._id.toString(),
        auctionId,
        buyerId,
        sellerId,
        amount: amountNumber,
        releaseReason,
      },
      session,
    );

    this.logger.log(
      `Escrow ${escrowId} released. Reason: ${releaseReason}, Amount: ${amountNumber} credited to seller ${sellerId}`,
    );

    return updatedEscrow!;
  }

  /**
   * Refunds an escrow back to the buyer (admin dispute resolution).
   */
  async refundEscrow(
    escrowId: string,
    refundReason: string,
    session?: ClientSession,
    referenceType: TransactionReferenceType = TransactionReferenceType.ESCROW,
    referenceId?: string,
  ): Promise<Escrow> {
    const escrow = await this.escrowRepository.findById(escrowId, session);
    if (!escrow) {
      throw new EscrowNotFoundException();
    }

    if (escrow.status === EscrowStatus.REFUNDED) {
      throw new EscrowAlreadyRefundedException();
    }

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new EscrowAlreadyReleasedException();
    }

    if (
      escrow.status === EscrowStatus.DISPUTED &&
      referenceType !== TransactionReferenceType.DISPUTE
    ) {
      throw new EscrowAlreadyDisputedException();
    }

    const amountNumber = Number(escrow.amount.toString());
    const buyerId = escrow.buyerId.toString();
    const auctionId = escrow.auctionId.toString();
    const sellerId = escrow.sellerId.toString();

    // 1. Credit buyer wallet with refunded amount
    await this.walletService.deposit(
      buyerId,
      amountNumber,
      referenceId ?? auctionId,
      session,
      escrow.currency,
      referenceType,
    );

    // 2. Update status to REFUNDED
    const updatedEscrow = await this.escrowRepository.updateStatus(
      escrowId,
      EscrowStatus.REFUNDED,
      {
        refundedAt: new Date(),
        releaseReason: refundReason,
      },
      session,
    );

    // 3. Outbox event
    await this.outboxService.saveEvent(
      RabbitMQEvent.EscrowRefunded,
      {
        escrowId: escrow._id.toString(),
        auctionId,
        buyerId,
        sellerId,
        amount: amountNumber,
        refundReason,
      },
      session,
    );

    this.logger.log(
      `Escrow ${escrowId} refunded to buyer ${buyerId}. Reason: ${refundReason}, Amount: ${amountNumber}`,
    );

    return updatedEscrow!;
  }

  /**
   * Retrieves an escrow by ID.
   */
  async getEscrowById(id: string): Promise<Escrow> {
    const escrow = await this.escrowRepository.findById(id);
    if (!escrow) {
      throw new EscrowNotFoundException();
    }
    return escrow;
  }

  /**
   * Retrieves an escrow for a specific auction.
   */
  async getEscrowByAuctionId(auctionId: string): Promise<Escrow | null> {
    return this.escrowRepository.findByAuctionId(auctionId);
  }

  /**
   * Retrieves paginated escrows where the user is either buyer or seller.
   */
  async getMyEscrows(
    userId: string,
    input?: PaginationInput,
    filter?: EscrowFilterInput,
  ): Promise<EscrowsPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const mergedFilter: EscrowFilterInput = {
      ...filter,
      userId,
    };

    const { items, total } = await this.escrowRepository.findPaginated(
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
   * Admin: Retrieves all escrows paginated with filters.
   */
  async getAllEscrows(
    input?: PaginationInput,
    filter?: EscrowFilterInput,
  ): Promise<EscrowsPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const { items, total } = await this.escrowRepository.findPaginated(
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

  /**
   * Periodically called by EscrowExpirationService to auto-release escrows whose 7-day inspection window has expired.
   */
  async releaseExpiredHeldEscrows(limit = 50): Promise<number> {
    const expiredEscrows = await this.escrowRepository.findExpiredHeldEscrows(
      new Date(),
      limit,
    );

    let releasedCount = 0;
    for (const escrow of expiredEscrows) {
      try {
        const session = await this.connection.startSession();
        try {
          session.startTransaction();
          await this.releaseEscrow(
            escrow._id.toString(),
            'EXPIRED_INSPECTION_WINDOW',
            session,
          );
          await session.commitTransaction();
          releasedCount++;
        } catch (err) {
          await session.abortTransaction();
          this.logger.error(
            `Failed to auto-release expired escrow ${escrow._id.toString()}: ${(err as Error).message}`,
          );
        } finally {
          await session.endSession();
        }
      } catch (err) {
        this.logger.error(
          `Session error on auto-releasing escrow ${escrow._id.toString()}: ${(err as Error).message}`,
        );
      }
    }

    return releasedCount;
  }
}
