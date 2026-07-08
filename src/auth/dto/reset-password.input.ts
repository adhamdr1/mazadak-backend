import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/transformers/string.transformer';

@InputType()
export class ResetPasswordInput {
  @Field()
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  token: string;

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
}
