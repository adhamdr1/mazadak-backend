import { Inject, Injectable } from '@nestjs/common';
import {
  type ITransactionRepository,
  type CreateTransactionData,
} from './interfaces/transaction.repository.interface';
import { Transaction } from './entities/transaction.entity';
import { TransactionsPage } from './dto/transactions-page.type';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
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
    input: PaginationInput,
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const { page, limit } = input;

    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) throw new WalletNotFoundException();

    const walletId = wallet._id.toString();

    const [items, total] = await Promise.all([
      this.transactionRepository.findByWalletId(walletId, page, limit, filter),
      this.transactionRepository.countByWalletId(walletId, filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async getAllTransactions(
    input: PaginationInput,
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const { page, limit } = input;
    const [items, total] = await Promise.all([
      this.transactionRepository.findAll(page, limit, filter),
      this.transactionRepository.countAll(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async sumTodayRevenue(): Promise<number> {
    return this.transactionRepository.sumTodayRevenue();
  }
}
