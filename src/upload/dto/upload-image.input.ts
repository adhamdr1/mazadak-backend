import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class UploadImageInput {
  @Field(() => String, { description: 'Base64 encoded image string' })
  @IsString()
  @IsNotEmpty()
  base64Data: string;

  @Field(() => String, {
    nullable: true,
    description: 'Optional folder name to store the image in',
  })
  @IsString()
  @IsOptional()
  folder?: string;
}
