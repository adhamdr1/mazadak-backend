import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetWalletBalanceQuery } from '../get-wallet-balance.query';
import { Inject } from '@nestjs/common';
import { type IWalletRepository } from '../../interfaces/wallet.repository.interface';

@QueryHandler(GetWalletBalanceQuery)
export class GetWalletBalanceHandler implements IQueryHandler<GetWalletBalanceQuery> {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(query: GetWalletBalanceQuery) {
    const wallet = await this.walletRepository.findByUserId(
      query.userId,
      query.session,
    );
    return {
      balance: wallet ? wallet.balance.toString() : '0.00',
      heldBalance: wallet ? wallet.heldBalance.toString() : '0.00',
    };
  }
}
