import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { ReviewsSortField } from '../enums/reviews-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

@InputType()
export class ReviewsSortInput {
  @Field(() => ReviewsSortField, {
    defaultValue: ReviewsSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ReviewsSortField)
  field: ReviewsSortField = ReviewsSortField.CREATED_AT;

  @Field(() => SortOrder, {
    defaultValue: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
