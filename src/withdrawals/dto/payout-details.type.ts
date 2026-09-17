import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PayoutDetails {
  @Field({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  bankName?: string;

  @Field({ nullable: true })
  accountHolderName?: string;

  @Field({ nullable: true })
  accountNumber?: string;

  @Field({ nullable: true })
  iban?: string;

  @Field({ nullable: true })
  ipaAddress?: string;
}
