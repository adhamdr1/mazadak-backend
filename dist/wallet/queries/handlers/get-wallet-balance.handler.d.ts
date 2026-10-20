import { IQueryHandler } from '@nestjs/cqrs';
import { GetWalletBalanceQuery } from '../get-wallet-balance.query';
import { type IWalletRepository } from '../../interfaces/wallet.repository.interface';
export declare class GetWalletBalanceHandler implements IQueryHandler<GetWalletBalanceQuery> {
    private readonly walletRepository;
    constructor(walletRepository: IWalletRepository);
    execute(query: GetWalletBalanceQuery): Promise<{
        balance: string;
        heldBalance: string;
    }>;
}
