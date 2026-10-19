import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UsersSortInput } from './users-sort.input';
import { UserRole } from '../enums/user-role.enum';
import { IsAfter } from '../../common/decorators/is-after.decorator';

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

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @IsAfter('startDate')
  endDate?: Date;
}
