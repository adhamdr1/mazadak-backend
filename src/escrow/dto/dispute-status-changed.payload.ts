import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

/**
 * Payload sent to subscribers (openedBy user and againstUser) when a dispute status changes.
 */
@ObjectType()
export class DisputeStatusChangedPayload {
  @Field(() => ID)
  disputeId!: string;

  @Field(() => ID)
  escrowId!: string;

  @Field(() => ID)
  auctionId!: string;

  @Field(() => DisputeStatus)
  status!: DisputeStatus;

  @Field(() => DisputeResolution, { nullable: true })
  adminDecision?: DisputeResolution;

  @Field({ nullable: true })
  adminNotes?: string;

  @Field({ nullable: true })
  resolvedAt?: Date;
}

export interface DisputeStatusChangedInternalPayload extends DisputeStatusChangedPayload {
  openedById: string;
  againstUserId: string;
}
