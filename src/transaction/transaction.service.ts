import { Inject, Injectable } from '@nestjs/common';
import type { ITransactionRepository } from './interfaces/transaction.repository.interface';
import type { CreateTransactionData } from './interfaces/transaction.repository.interface';
import { Transaction } from './entities/transaction.entity';
import { TransactionsPage } from './dto/transactions-page.type';
import { MyTransactionsInput } from './dto/my-transactions.input';
import type { IWalletRepository } from '../wallet/interfaces/wallet.repository.interface';
import { WalletNotFoundException } from '../wallet/exceptions/wallet-not-found.exception';

@Injectable()
export class TransactionService {
  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
  ) {}

  // ─── Internal (called by WalletService) ──────────────────────────────────────

  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    return this.transactionRepository.create(data);
  }

  // ─── Resolver ────────────────────────────────────────────────────────────────

  async getMyTransactions(
    userId: string,
    input: MyTransactionsInput,
  ): Promise<TransactionsPage> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;

    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) throw new WalletNotFoundException();

    const walletId = wallet._id.toString();

    const [items, total] = await Promise.all([
      this.transactionRepository.findByWalletId(
        walletId,
        page,
        limit,
        input.type,
      ),
      this.transactionRepository.countByWalletId(walletId, input.type),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
}
