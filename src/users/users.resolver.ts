import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FindUserInput } from './dto/find-user.input';

@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { name: 'me' })
  async me(@CurrentUser() currentUser: JwtPayload): Promise<User> {
    return this.usersService.findById(currentUser.sub);
  }

  @Query(() => User, { name: 'findUser' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findUser(@Args('input') input: FindUserInput): Promise<User> {
    return this.usersService.findById(input.id);
  }
}
