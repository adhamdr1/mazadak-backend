import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuctionCategory } from '../enums/auction-category.enum';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionsSortInput } from './auctions-sort.input';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

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

  @Field(() => AuctionsSortInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuctionsSortInput)
  sort?: AuctionsSortInput;
}
