import { Field, InputType, GraphQLISODateTime } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsUrl,
  IsEnum,
  IsDate,
} from 'class-validator';
import { trim } from '../../common/transformers/string.transformer';
import { AuctionCategory } from '../enums/auction-category.enum';

@InputType()
export class UpdateAuctionInput {
  @Field({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @Field(() => AuctionCategory, { nullable: true })
  @IsOptional()
  @IsEnum(AuctionCategory, { message: 'Invalid auction category' })
  category?: AuctionCategory;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Invalid start time format' })
  startTime?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Invalid end time format' })
  endTime?: Date;
}
