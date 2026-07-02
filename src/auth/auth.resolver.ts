import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { Public } from '../common/decorators/public.decorator';

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
}
