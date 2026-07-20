import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UploadImageResponse {
  @Field(() => String, { description: 'Public URL of the uploaded image' })
  url: string;
}
