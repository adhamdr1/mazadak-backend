import { User } from '../../users/entities/user.entity';
export declare class AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}
