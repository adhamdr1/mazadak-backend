import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class UsersFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
