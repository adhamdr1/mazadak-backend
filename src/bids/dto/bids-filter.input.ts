import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BidStatus } from '../enums/bid-status.enum';
import { BidsSortInput } from './bids-sort.input';

@InputType()
export class BidsFilterInput {
  @Field(() => BidStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BidStatus)
  status?: BidStatus;

  @Field(() => BidsSortInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidsSortInput)
  sort?: BidsSortInput;
}
