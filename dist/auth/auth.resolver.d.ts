import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { RegisterResponse } from './dto/register.response';
import { LoginInput } from './dto/login.input';
import { GoogleLoginInput } from './dto/google-login.input';
import { GoogleRegisterInput } from './dto/google-register.input';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { Request } from 'express';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { UpdatePasswordInput } from './dto/update-password.input';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerInput: RegisterInput): Promise<RegisterResponse>;
    login(loginInput: LoginInput): Promise<AuthResponse>;
    googleRegister(input: GoogleRegisterInput): Promise<AuthResponse>;
    googleLogin(googleLoginInput: GoogleLoginInput): Promise<AuthResponse>;
    confirmEmail(token: string): Promise<boolean>;
    resendConfirmationEmail(email: string): Promise<boolean>;
    requestReactivation(email: string): Promise<boolean>;
    confirmReactivation(token: string): Promise<boolean>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    logout(refreshToken: string): Promise<boolean>;
    logoutAll(user: JwtPayload): Promise<boolean>;
    forgotPassword(input: ForgotPasswordInput, context: {
        req: Request;
    }): Promise<boolean>;
    resetPassword(input: ResetPasswordInput): Promise<boolean>;
    updatePassword(user: JwtPayload, input: UpdatePasswordInput): Promise<boolean>;
}
