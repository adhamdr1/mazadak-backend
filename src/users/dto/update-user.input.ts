import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Type, Transform } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxDate,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  trim,
  trimLowerCase,
} from '../../common/transformers/string.transformer';
import { AddressInput } from './address.input';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, {
    message: 'First name must be at least 2 characters long',
  })
  @MaxLength(50, {
    message: 'First name must not exceed 50 characters',
  })
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, {
    message: 'Last name must be at least 2 characters long',
  })
  @MaxLength(50, {
    message: 'Last name must not exceed 50 characters',
  })
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, {
    message: 'Email must not exceed 255 characters',
  })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'Invalid Egyptian phone number',
  })
  phoneNumber?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: 'Invalid date format',
  })
  @MaxDate(() => new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), {
    message: 'User must be at least 18 years old',
  })
  dateOfBirth?: Date;

  @Field(() => AddressInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInput)
  address?: AddressInput;
}
