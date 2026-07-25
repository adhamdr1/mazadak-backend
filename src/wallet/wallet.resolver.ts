import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DepositInput } from './dto/deposit.input';
import { WithdrawInput } from './dto/withdraw.input';
import { WalletsPage } from './dto/wallets-page.type';
import { PaginationInput } from '../common/dto/pagination.input';

@Resolver(() => Wallet)
@UseGuards(JwtAuthGuard)
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Query(() => WalletsPage, { name: 'wallets' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async wallets(@Args('input') input: PaginationInput): Promise<WalletsPage> {
    return this.walletService.getAllWallets(input);
  }

  @Query(() => Wallet, { name: 'adminGetWallet' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetWallet(@Args('userId') userId: string): Promise<Wallet> {
    return this.walletService.getWalletByUserId(userId);
  }

  @Query(() => Wallet, { name: 'myWallet' })
  async myWallet(@CurrentUser() currentUser: JwtPayload): Promise<Wallet> {
    return this.walletService.getMyWallet(currentUser.sub);
  }

  // ─── Computed Fields ──────────────────────────────────────────────────────

  @ResolveField(() => Number, { name: 'availableBalance' })
  availableBalance(@Parent() wallet: Wallet): number {
    return wallet.balance - wallet.heldBalance;
  }

  // ─── Mutations (Mock — Stripe integration pending) ────────────────────────

  @Mutation(() => Wallet, { name: 'deposit' })
  async deposit(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: DepositInput,
  ): Promise<Wallet> {
    return this.walletService.deposit(currentUser.sub, input.amount);
  }

  @Mutation(() => Wallet, { name: 'withdraw' })
  async withdraw(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: WithdrawInput,
  ): Promise<Wallet> {
    return this.walletService.withdraw(currentUser.sub, input.amount);
  }
}
