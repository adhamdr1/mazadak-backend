import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { EscrowStatus } from '../enums/escrow-status.enum';

@InputType()
export class EscrowFilterInput {
  @Field(() => EscrowStatus, { nullable: true })
  @IsOptional()
  @IsEnum(EscrowStatus)
  status?: EscrowStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  buyerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  sellerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsMongoId()
  auctionId?: string;
}
