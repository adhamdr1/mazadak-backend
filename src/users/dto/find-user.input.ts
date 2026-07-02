import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

@InputType()
export class FindUserInput {
  @Field()
  @IsMongoId()
  id!: string;
}
