import { ObjectType, Field } from '@nestjs/graphql';
import { ChatMessage } from '../entities/chat-message.entity';

@ObjectType()
export class ChatMessagesConnection {
  @Field(() => [ChatMessage])
  items!: ChatMessage[];

  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  endCursor!: string | null;
}
