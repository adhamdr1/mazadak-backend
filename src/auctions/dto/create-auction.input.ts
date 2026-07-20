import { Field, InputType, Float, GraphQLISODateTime } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUrl,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { trim } from '../../common/transformers/string.transformer';
import { AuctionCategory } from '../enums/auction-category.enum';

@InputType()
export class CreateAuctionInput {
  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title!: string;

  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description!: string;

  @Field(() => AuctionCategory)
  @IsEnum(AuctionCategory, { message: 'Invalid auction category' })
  category!: AuctionCategory;

  @Field(() => Float)
  @IsNumber({}, { message: 'Starting price must be a number' })
  @Min(1, { message: 'Starting price must be at least 1' })
  startingPrice!: number;

  @Field(() => Float)
  @IsNumber({}, { message: 'Minimum bid increment must be a number' })
  @Min(1, { message: 'Minimum bid increment must be at least 1' })
  minimumBidIncrement!: number;

  @Field(() => [String])
  @IsArray({ message: 'Images must be an array' })
  @ArrayMinSize(1, { message: 'At least one image is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images!: string[];

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate({ message: 'Invalid start time format' })
  startTime!: Date;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate({ message: 'Invalid end time format' })
  endTime!: Date;
}
