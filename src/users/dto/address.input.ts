import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../../common/transformers/string.transformer';

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