import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { Public } from '../common/decorators/public.decorator';
import { LoginInput } from './dto/login.input';
import { GoogleLoginInput } from './dto/google-login.input';
import { GoogleRegisterInput } from './dto/google-register.input';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { UpdatePasswordInput } from './dto/update-password.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Query(() => String)
  health(): string {
    return 'API is running';
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => AuthResponse, { name: 'register' })
  async register(
    @Args('registerInput') registerInput: RegisterInput,
  ): Promise<AuthResponse> {
    return this.authService.register(registerInput);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => AuthResponse, { name: 'login' })
  async login(
    @Args('loginInput') loginInput: LoginInput,
  ): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => AuthResponse, { name: 'googleRegister' })
  async googleRegister(
    @Args('googleRegisterInput') input: GoogleRegisterInput,
  ): Promise<AuthResponse> {
    return this.authService.googleRegister(input);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => AuthResponse, { name: 'googleLogin' })
  async googleLogin(
    @Args('googleLoginInput') googleLoginInput: GoogleLoginInput,
  ): Promise<AuthResponse> {
    return this.authService.googleLogin(googleLoginInput);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => Boolean, { name: 'confirmEmail' })
  async confirmEmail(
    @Args('token', { type: () => String }) token: string,
  ): Promise<boolean> {
    return this.authService.confirmEmail(token);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => Boolean, { name: 'resendConfirmationEmail' })
  async resendConfirmationEmail(
    @Args('email', { type: () => String }) email: string,
  ): Promise<boolean> {
    return this.authService.resendConfirmationEmail(email);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => AuthResponse, { name: 'refreshToken' })
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
  ): Promise<AuthResponse> {
    return this.authService.refreshTokens(refreshToken);
  }

  @Public()
  @Mutation(() => Boolean, { name: 'logout' })
  async logout(@Args('refreshToken') refreshToken: string): Promise<boolean> {
    return this.authService.logout(refreshToken);
  }

  @Mutation(() => Boolean, { name: 'logoutAll' })
  async logoutAll(@CurrentUser() user: JwtPayload): Promise<boolean> {
    return this.authService.logoutAll(user.sub);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => Boolean, { name: 'forgotPassword' })
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
    @Context() context: { req: Request },
  ): Promise<boolean> {
    const req = context.req;
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'Unknown IP';
    const browser = req.headers['user-agent'] ?? 'Unknown Browser';

    return this.authService.forgotPassword(input, ip, browser);
  }

  @Public()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Mutation(() => Boolean, { name: 'resetPassword' })
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<boolean> {
    return this.authService.resetPassword(input);
  }

  @Mutation(() => Boolean, { name: 'updatePassword' })
  async updatePassword(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: UpdatePasswordInput,
  ): Promise<boolean> {
    return this.authService.updatePassword(user.sub, input);
  }
}
