import { Field, InputType, GraphQLISODateTime } from '@nestjs/graphql';
import { Type, Transform } from 'class-transformer';
import {
  IsDate,
  MaxDate,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
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
export class CreateUserInput {
  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, {
    message: 'First name must be at least 2 characters long',
  })
  @MaxLength(50, {
    message: 'First name must not exceed 50 characters',
  })
  firstName!: string;

  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, {
    message: 'Last name must be at least 2 characters long',
  })
  @MaxLength(50, {
    message: 'Last name must not exceed 50 characters',
  })
  lastName!: string;

  @Field()
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, {
    message: 'Email must not exceed 255 characters',
  })
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  password!: string; // accepts hashed string

  @Field()
  @Transform(trim)
  @IsString()
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'Invalid Egyptian phone number',
  })
  phoneNumber!: string;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate({ message: 'Invalid date format' })
  @MaxDate(() => new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), {
    message: 'User must be at least 18 years old',
  })
  dateOfBirth!: Date;

  @Field(() => AddressInput)
  @ValidateNested()
  @Type(() => AddressInput)
  address!: AddressInput;
}
