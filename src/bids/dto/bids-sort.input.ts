import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { BidsSortField } from '../enums/bids-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class BidsSortInput {
  @Field(() => BidsSortField, { defaultValue: BidsSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(BidsSortField)
  field: BidsSortField = BidsSortField.CREATED_AT;

  @Field(() => SortOrder, { defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
