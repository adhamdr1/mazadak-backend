import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { IsAfter } from '../../common/decorators/is-after.decorator';
import { TransactionsSortInput } from './transactions-sort.input';

@InputType()
export class TransactionsFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @Field(() => TransactionStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @IsAfter('startDate')
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAtBefore?: Date;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  hasChild?: boolean;

  @Field(() => TransactionsSortInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionsSortInput)
  sort?: TransactionsSortInput;
}
