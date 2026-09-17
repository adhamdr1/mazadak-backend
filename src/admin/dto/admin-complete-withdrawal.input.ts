import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

@InputType()
export class AdminCompleteWithdrawalInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  withdrawalId!: string;

  @Field()
  @IsNotEmpty({ message: 'ADMIN_REFERENCE_REQUIRED' })
  @IsString()
  adminReference!: string;

  @Field()
  @IsNotEmpty({ message: 'RECEIPT_URL_REQUIRED' })
  @IsUrl({}, { message: 'RECEIPT_URL_INVALID' })
  receiptUrl!: string;
}
