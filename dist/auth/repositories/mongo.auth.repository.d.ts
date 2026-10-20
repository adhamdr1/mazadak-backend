import { Model } from 'mongoose';
import { IAuthRepository } from '../interfaces/auth-repository.interface';
import { RefreshToken, RefreshTokenDocument } from '../entities/refresh-token.entity';
export declare class MongoAuthRepository implements IAuthRepository {
    private readonly refreshTokenModel;
    constructor(refreshTokenModel: Model<RefreshTokenDocument>);
    saveRefreshToken(userId: string, hashedToken: string, expiresAt: Date): Promise<void>;
    findRefreshToken(hashedToken: string): Promise<RefreshToken | null>;
    deleteRefreshToken(hashedToken: string): Promise<void>;
    deleteAllUserTokens(userId: string): Promise<void>;
}
