import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

@InputType()
export class ResolveDisputeInput {
  @Field(() => String)
  @IsMongoId()
  @IsNotEmpty()
  disputeId!: string;

  @Field(() => DisputeResolution)
  @IsEnum(DisputeResolution)
  @IsNotEmpty()
  decision!: DisputeResolution;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}
