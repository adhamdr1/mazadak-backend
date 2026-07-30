import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class UploadSignatureResponse {
  @Field()
  signature!: string;

  @Field(() => Float)
  timestamp!: number;

  @Field()
  apiKey!: string;

  @Field()
  cloudName!: string;

  @Field()
  folder!: string;
}
