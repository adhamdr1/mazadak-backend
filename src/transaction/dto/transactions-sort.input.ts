import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { TransactionsSortField } from '../enums/transactions-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class TransactionsSortInput {
  @Field(() => TransactionsSortField, {
    defaultValue: TransactionsSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(TransactionsSortField)
  field: TransactionsSortField = TransactionsSortField.CREATED_AT;

  @Field(() => SortOrder, { defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
