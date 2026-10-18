import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DisputeStatus } from '../enums/dispute-status.enum';

@InputType()
export class DisputeFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => DisputeStatus, { nullable: true })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  openedById?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  againstUserId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  auctionId?: string;
}
