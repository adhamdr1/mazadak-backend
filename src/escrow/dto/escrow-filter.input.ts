import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EscrowStatus } from '../enums/escrow-status.enum';
import { IsAfter } from '../../common/decorators/is-after.decorator';

@InputType()
export class EscrowFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  excludeDisputed?: boolean;

  @Field(() => EscrowStatus, { nullable: true })
  @IsOptional()
  @IsEnum(EscrowStatus)
  status?: EscrowStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  buyerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  sellerId?: string;

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
