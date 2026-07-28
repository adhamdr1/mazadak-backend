import { ObjectType, Field, Float, ID, Int } from '@nestjs/graphql';
import { Bid } from '../entities/bid.entity';

/**
 * Enriched payload sent to subscribers when a new bid is placed.
 * Includes all data the Frontend needs to update the UI without an extra Query.
 */
@ObjectType()
export class BidAddedPayload {
  /** The newly placed bid */
  @Field(() => Bid)
  bid!: Bid;

  /** Updated auction price after this bid */
  @Field(() => Float)
  currentPrice!: number;

  /** ID of the current leading bidder (winner so far) */
  @Field(() => ID)
  leadingBidderId!: string;

  /** Total number of bids on this auction */
  @Field(() => Int)
  bidCount!: number;
}
