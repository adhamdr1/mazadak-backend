import { InputType, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ArrayMaxSize,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DisputeReason } from '../enums/dispute-reason.enum';

@InputType()
export class CreateDisputeInput {
  @Field(() => String)
  @IsMongoId()
  @IsNotEmpty()
  auctionId!: string;

  @Field(() => DisputeReason)
  @IsEnum(DisputeReason)
  @IsNotEmpty()
  reason!: DisputeReason;

  @Field(() => String)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @Field(() => [String], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  evidenceUrls: string[] = [];
}
