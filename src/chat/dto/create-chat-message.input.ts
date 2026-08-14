import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsMongoId,
  IsOptional,
  IsUUID,
  MaxLength,
  IsArray,
  IsString,
  ArrayMaxSize,
} from 'class-validator';
import { ChatMessageType } from '../enums/chat-message-type.enum';

@InputType()
export class CreateChatMessageInput {
  @Field(() => ID)
  @IsMongoId()
  auctionId!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(2000)
  content?: string;

  @Field(() => ChatMessageType, { nullable: true })
  @IsOptional()
  type?: ChatMessageType;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  mediaUrls?: string[];

  @Field()
  @IsUUID()
  clientMessageId!: string;
}
