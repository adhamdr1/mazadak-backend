import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
@ObjectType()
export class ReviewCriteria {
  @Field(() => Int, { nullable: true })
  @Prop({ type: Number, min: 1, max: 5, required: false })
  itemAccuracy?: number;

  @Field(() => Int, { nullable: true })
  @Prop({ type: Number, min: 1, max: 5, required: false })
  communication?: number;

  @Field(() => Int, { nullable: true })
  @Prop({ type: Number, min: 1, max: 5, required: false })
  packaging?: number;

  @Field(() => Int, { nullable: true })
  @Prop({ type: Number, min: 1, max: 5, required: false })
  smoothExperience?: number;
}

export const ReviewCriteriaSchema =
  SchemaFactory.createForClass(ReviewCriteria);
