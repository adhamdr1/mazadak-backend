import { Field, InputType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { Type, Transform } from 'class-transformer';
import {
  IsDate,
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

@InputType()
export class AddressInput {
  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MinLength(2, { message: 'City must be at least 2 characters long' })
  @MaxLength(50, { message: 'City must not exceed 50 characters' })
  city!: string;

  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Street is required' })
  @MinLength(3, { message: 'Street must be at least 3 characters long' })
  @MaxLength(100, { message: 'Street must not exceed 100 characters' })
  street!: string;
}

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
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @MaxLength(100, {
    message: 'Password must not exceed 100 characters',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password!: string;

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
  dateOfBirth!: Date;

  @Field(() => AddressInput)
  @ValidateNested()
  @Type(() => AddressInput)
  address!: AddressInput;
}
