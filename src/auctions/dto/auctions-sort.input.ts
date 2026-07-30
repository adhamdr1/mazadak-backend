import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { AuctionsSortField } from '../enums/auctions-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class AuctionsSortInput {
  @Field(() => AuctionsSortField, {
    defaultValue: AuctionsSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(AuctionsSortField)
  field: AuctionsSortField = AuctionsSortField.CREATED_AT;

  @Field(() => SortOrder, { defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
