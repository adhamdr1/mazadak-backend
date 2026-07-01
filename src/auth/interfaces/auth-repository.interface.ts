import { RefreshToken } from '../entities/refresh-token.entity';

export interface IAuthRepository {
  // Persist a refresh token for a given user.
  saveRefreshToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void>;

  // Lookup a refresh token by its value — used during token rotation.
  findRefreshToken(hashedToken: string): Promise<RefreshToken | null>;

  // Remove a single refresh token — used on logout.
  deleteRefreshToken(hashedToken: string): Promise<void>;

  // Remove all refresh tokens for a user — used on password change or full logout.
  deleteAllUserTokens(userId: string): Promise<void>;
}
