import { InputType, Field } from '@nestjs/graphql';
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class ReplyReviewInput {
  @Field(() => String)
  @IsMongoId()
  reviewId!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reply!: string;
}
