import Redis from 'ioredis';
import { EscrowService } from './escrow.service';
export declare class EscrowExpirationService {
    private readonly escrowService;
    private readonly redis;
    private readonly logger;
    constructor(escrowService: EscrowService, redis: Redis);
    handleExpiredHeldEscrows(): Promise<void>;
}
