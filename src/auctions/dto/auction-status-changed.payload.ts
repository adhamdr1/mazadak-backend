import { ObjectType, Field } from '@nestjs/graphql';
import { Auction } from '../entities/auction.entity';

/**
 * Payload sent to subscribers when an auction status changes.
 * Carries the full updated auction so the Frontend can react without extra Queries:
 * - status === ACTIVE  → enable bid button, show "Auction Started"
 * - status === ENDED   → disable bid button, show winner popup
 * - status === CANCELLED → disable bid button, show "Auction Cancelled"
 */
@ObjectType()
export class AuctionStatusChangedPayload {
  @Field(() => Auction)
  auction!: Auction;
}
