import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class PaginationInput {
    @Field(() => Int, { defaultValue: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @Field(() => Int, { defaultValue: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;
}