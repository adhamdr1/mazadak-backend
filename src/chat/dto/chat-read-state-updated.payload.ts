import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ChatReadStateUpdatedPayload {
  @Field(() => ID)
  auctionId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID, { nullable: true })
  lastReadMessageId!: string | null;

  @Field(() => Date, { nullable: true })
  lastReadAt!: Date | null;
}
