import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { Public } from '../common/decorators/public.decorator';
import { LoginInput } from './dto/login.input';
import { GoogleLoginInput } from './dto/google-login.input';
import { GoogleRegisterInput } from './dto/google-register.input';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Query(() => String)
  health(): string {
    return 'API is running';
  }

  @Public()
  @Mutation(() => AuthResponse, { name: 'register' })
  async register(
    @Args('registerInput') registerInput: RegisterInput,
  ): Promise<AuthResponse> {
    return this.authService.register(registerInput);
  }

  @Public()
  @Mutation(() => AuthResponse, { name: 'login' })
  async login(
    @Args('loginInput') loginInput: LoginInput,
  ): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Public()
  @Mutation(() => AuthResponse, { name: 'googleRegister' })
  async googleRegister(
    @Args('googleRegisterInput') input: GoogleRegisterInput,
  ): Promise<AuthResponse> {
    return this.authService.googleRegister(input);
  }

  @Public()
  @Mutation(() => AuthResponse, { name: 'googleLogin' })
  async googleLogin(
    @Args('googleLoginInput') googleLoginInput: GoogleLoginInput,
  ): Promise<AuthResponse> {
    return this.authService.googleLogin(googleLoginInput);
  }

  @Public()
  @Mutation(() => Boolean, { name: 'confirmEmail' })
  async confirmEmail(
    @Args('token', { type: () => String }) token: string,
  ): Promise<boolean> {
    return this.authService.confirmEmail(token);
  }

  @Public()
  @Mutation(() => Boolean, { name: 'resendConfirmationEmail' })
  async resendConfirmationEmail(
    @Args('email', { type: () => String }) email: string,
  ): Promise<boolean> {
    return this.authService.resendConfirmationEmail(email);
  }

  // ... داخل الكلاس
  @Public()
  @Mutation(() => Boolean, { name: 'logout' })
  async logout(@Args('refreshToken') refreshToken: string): Promise<boolean> {
    return this.authService.logout(refreshToken);
  }
  // هذه محمية (غير Public) لأننا نحتاج لمعرفة من هو المستخدم الحالي
  @Mutation(() => Boolean, { name: 'logoutAll' })
  async logoutAll(@CurrentUser() user: JwtPayload): Promise<boolean> {
    return this.authService.logoutAll(user.sub);
  }
}
