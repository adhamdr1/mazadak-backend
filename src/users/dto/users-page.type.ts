import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@ObjectType()
export class UsersPage {
  @Field(() => [User])
  items!: User[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
