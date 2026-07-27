import { ObjectType, Field, Int } from '@nestjs/graphql';
import { InAppNotification } from '../entities/in-app-notification.entity';

@ObjectType()
export class InAppNotificationsPage {
  @Field(() => [InAppNotification])
  items!: InAppNotification[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
