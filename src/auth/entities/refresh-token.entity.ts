import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true, versionKey: false })
export class RefreshToken {
  // Reference to the user who owns this token.
  // Indexed so we can quickly delete all tokens for a user (logout everywhere).
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  // SHA-256 hash of the raw refresh token.
  // The client holds the raw token; we store only the hash.
  @Prop({ required: true, unique: true })
  hashedToken!: string;

  // When this token expires — used to clean up stale tokens from DB.
  @Prop({ required: true })
  expiresAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// TTL Index — MongoDB deletes the document automatically when expiresAt is reached.
// expireAfterSeconds: 0 means delete at exactly the expiresAt timestamp.
// C# equivalent: Hangfire or hosted service running a cleanup job.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
