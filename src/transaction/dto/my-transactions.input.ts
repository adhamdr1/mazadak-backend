import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsPositive, IsEnum } from 'class-validator';
import { TransactionType } from '../enums/transaction-type.enum';

@InputType()
export class MyTransactionsInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number;

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
