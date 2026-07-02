import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/transformers/string.transformer';
@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @Transform(trimLowerCase)
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;
}
