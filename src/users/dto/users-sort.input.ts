import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { UsersSortField } from '../enums/users-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class UsersSortInput {
  @Field(() => UsersSortField, { defaultValue: UsersSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(UsersSortField)
  field: UsersSortField = UsersSortField.CREATED_AT;

  @Field(() => SortOrder, { defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
