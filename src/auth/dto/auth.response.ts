import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

// Returned after a successful register or login.
@ObjectType()
export class AuthResponse {
  // Short-lived token (15m) — used to authenticate every request.
  @Field()
  accessToken!: string;

  // Long-lived token (7d) — used only to get a new access token.
  @Field()
  refreshToken!: string;

  // The authenticated user's data.
  @Field(() => User)
  user!: User;
}
