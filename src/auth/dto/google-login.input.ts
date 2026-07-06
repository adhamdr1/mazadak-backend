import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class GoogleLoginInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  token!: string;
}
