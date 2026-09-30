import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { Auction } from '../../auctions/entities/auction.entity';
import { ChatMessage } from '../entities/chat-message.entity';

@ObjectType()
export class ChatRoom {
  @Field(() => ID)
  auctionId!: Types.ObjectId;

  @Field(() => Auction)
  auction!: Auction;

  @Field(() => ChatMessage, { nullable: true })
  lastMessage!: ChatMessage | null;

  @Field(() => Date, { nullable: true })
  lastMessageAt!: Date | null;

  @Field(() => Int)
  unreadCount!: number;
}
