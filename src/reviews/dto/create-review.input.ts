import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewCriteriaInput } from './review-criteria.input';

@InputType()
export class CreateReviewInput {
  @Field(() => String)
  @IsMongoId()
  auctionId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @Field(() => ReviewCriteriaInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReviewCriteriaInput)
  criteria?: ReviewCriteriaInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
