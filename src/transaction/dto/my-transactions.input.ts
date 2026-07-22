import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsPositive, IsEnum, Max } from 'class-validator';
import { TransactionType } from '../enums/transaction-type.enum';

@InputType()
export class MyTransactionsInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @IsPositive()
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @IsPositive()
  @Max(100, { message: 'Limit must not exceed 100' })
  limit: number = 10;

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
