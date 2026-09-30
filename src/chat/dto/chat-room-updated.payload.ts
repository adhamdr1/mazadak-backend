import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ChatMessage } from '../entities/chat-message.entity';

@ObjectType()
export class ChatRoomUpdatedPayload {
  @Field(() => ID)
  auctionId!: string;

  @Field(() => Int)
  unreadCount!: number;

  @Field(() => Int)
  totalUnreadRooms!: number;

  @Field(() => Date)
  lastMessageAt!: Date;

  @Field(() => ChatMessage)
  lastMessage!: ChatMessage;
}
