import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReviewType } from '../enums/review-type.enum';

@InputType()
export class ReviewsFilterInput {
  @Field(() => ReviewType, { nullable: true })
  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;
}
