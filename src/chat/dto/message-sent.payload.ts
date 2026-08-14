import { ObjectType, Field } from '@nestjs/graphql';
import { ChatMessage } from '../entities/chat-message.entity';

@ObjectType()
export class MessageSentPayload {
  @Field(() => ChatMessage)
  message!: ChatMessage;

  @Field()
  auctionId!: string;
}
