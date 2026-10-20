import { RefreshToken } from '../entities/refresh-token.entity';
export interface IAuthRepository {
    saveRefreshToken(userId: string, hashedToken: string, expiresAt: Date): Promise<void>;
    findRefreshToken(hashedToken: string): Promise<RefreshToken | null>;
    deleteRefreshToken(hashedToken: string): Promise<void>;
    deleteAllUserTokens(userId: string): Promise<void>;
}
