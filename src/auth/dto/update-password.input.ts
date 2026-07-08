import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType()
export class UpdatePasswordInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

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
