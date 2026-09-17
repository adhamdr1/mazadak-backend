import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class AdminRejectWithdrawalInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  withdrawalId!: string;

  @Field()
  @IsNotEmpty({ message: 'REJECTION_REASON_REQUIRED' })
  @IsString()
  @MinLength(10, { message: 'REJECTION_REASON_TOO_SHORT' })
  rejectionReason!: string;
}
