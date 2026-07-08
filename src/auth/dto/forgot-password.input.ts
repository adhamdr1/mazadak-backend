import { InputType, Field } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/transformers/string.transformer';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @Transform(trimLowerCase)
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}
