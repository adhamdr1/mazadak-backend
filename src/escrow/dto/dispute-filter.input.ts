import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { IsAfter } from '../../common/decorators/is-after.decorator';

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
}
