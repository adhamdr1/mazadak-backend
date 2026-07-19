import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AuctionCategory } from '../enums/auction-category.enum';
import { AuctionStatus } from '../enums/auction-status.enum';

@InputType()
export class AuctionsFilterInput {
  @Field(() => AuctionCategory, { nullable: true })
  @IsOptional()
  @IsEnum(AuctionCategory, { message: 'Invalid auction category' })
  category?: AuctionCategory;

  @Field(() => AuctionStatus, { nullable: true })
  @IsOptional()
  @IsEnum(AuctionStatus, { message: 'Invalid auction status' })
  status?: AuctionStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Search term must not exceed 100 characters' })
  search?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  limit: number = 10;
}
