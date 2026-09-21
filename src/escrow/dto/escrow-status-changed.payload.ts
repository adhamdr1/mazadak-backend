import { ObjectType, Field, ID } from '@nestjs/graphql';
import { EscrowStatus } from '../enums/escrow-status.enum';

/**
 * Payload sent to subscribers (buyer and seller) when an escrow status changes.
 */
@ObjectType()
export class EscrowStatusChangedPayload {
  @Field(() => ID)
  escrowId!: string;

  @Field(() => ID)
  auctionId!: string;

  @Field(() => EscrowStatus)
  status!: EscrowStatus;

  @Field({ nullable: true })
  releasedAt?: Date;

  @Field({ nullable: true })
  refundedAt?: Date;

  @Field(() => ID, { nullable: true })
  disputeId?: string;

  @Field({ nullable: true })
  releaseReason?: string;
}

export interface EscrowStatusChangedInternalPayload extends EscrowStatusChangedPayload {
  buyerId: string;
  sellerId: string;
}
