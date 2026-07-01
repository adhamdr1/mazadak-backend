import { Field, InputType, GraphQLISODateTime } from '@nestjs/graphql';
import { Type, Transform } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
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

// Re-use AddressInput from users — same GraphQL type, same Mongo structure.
// Auth depends on Users already, so this import is acceptable.
import { AddressInput } from '../../users/dto/address.input';

@InputType()
export class RegisterInput {
  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName!: string;

  @Field()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName!: string;

  @Field()
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  // Full password validation lives here (raw user input).
  // AuthService hashes it before passing to UsersService.
  @Field()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
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
  @Matches(/^01[0125][0-9]{8}$/, { message: 'Invalid Egyptian phone number' })
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
