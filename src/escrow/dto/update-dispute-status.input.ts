import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { DisputeStatus } from '../enums/dispute-status.enum';

@InputType()
export class UpdateDisputeStatusInput {
  @Field(() => String)
  @IsMongoId()
  @IsNotEmpty()
  disputeId!: string;

  @Field(() => DisputeStatus)
  @IsEnum(DisputeStatus)
  @IsNotEmpty()
  status!: DisputeStatus;
}
