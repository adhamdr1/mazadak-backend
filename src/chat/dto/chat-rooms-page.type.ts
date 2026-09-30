import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ChatRoom } from './chat-room.type';

@ObjectType()
export class ChatRoomsPage {
  @Field(() => [ChatRoom])
  items!: ChatRoom[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Boolean)
  hasNextPage!: boolean;
}
