import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
@ObjectType()
export class RatingBreakdown {
  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  oneStar!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  twoStar!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  threeStar!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  fourStar!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  fiveStar!: number;
}

export const RatingBreakdownSchema =
  SchemaFactory.createForClass(RatingBreakdown);
