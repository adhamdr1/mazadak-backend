import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FindUserInput } from './dto/find-user.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // ─── User Queries ──────────────────────────────────────────────────────────

  @Query(() => User, { name: 'me' })
  async me(@CurrentUser() currentUser: JwtPayload): Promise<User> {
    return this.usersService.findById(currentUser.sub);
  }

  // ─── Admin Queries ─────────────────────────────────────────────────────────

  @Query(() => User, { name: 'findUser' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findUser(@Args('input') input: FindUserInput): Promise<User> {
    return this.usersService.findById(input.id);
  }

  @Query(() => [User], { name: 'users' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(@Args('input') input: PaginationInput): Promise<User[]> {
    return this.usersService.findAll(input);
  }

  // ─── User Mutations ────────────────────────────────────────────────────────

  @Mutation(() => User, { name: 'updateProfile' })
  async updateProfile(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.updateProfile(currentUser, currentUser.sub, input);
  }

  @Mutation(() => Boolean, { name: 'deleteAccount' })
  async deleteAccount(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<boolean> {
    await this.usersService.softDelete(currentUser, currentUser.sub);
    return true;
  }

  // ─── Admin Mutations ───────────────────────────────────────────────────────

  @Mutation(() => User, { name: 'adminUpdateUser' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateUser(
    @CurrentUser() currentUser: JwtPayload,
    @Args('targetUser') targetUser: FindUserInput,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.updateProfile(currentUser, targetUser.id, input);
  }

  @Mutation(() => Boolean, { name: 'adminDeleteUser' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDeleteUser(
    @CurrentUser() currentUser: JwtPayload,
    @Args('targetUser') targetUser: FindUserInput,
  ): Promise<boolean> {
    await this.usersService.softDelete(currentUser, targetUser.id);
    return true;
  }
}
