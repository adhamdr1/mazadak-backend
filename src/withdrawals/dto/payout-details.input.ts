import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class PayoutDetailsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bankName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  iban?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ipaAddress?: string;
}
