import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class WithdrawalsFilterInput {
  @Field(() => WithdrawalStatus, { nullable: true })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @Field(() => PayoutMethod, { nullable: true })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payoutMethod?: PayoutMethod;

  @Field(() => SortOrder, { nullable: true, defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
