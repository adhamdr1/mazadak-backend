import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsEnum } from 'class-validator';
import { BidStatus } from '../enums/bid-status.enum';

@InputType()
export class BidsFilterInput {
  @Field(() => BidStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BidStatus)
  status?: BidStatus;
}
