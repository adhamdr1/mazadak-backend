import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UsersSortInput } from './users-sort.input';

@InputType()
export class UsersFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => UsersSortInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UsersSortInput)
  sort?: UsersSortInput;
}
