"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../../users/users.service");
const auctions_service_1 = require("../../auctions/auctions.service");
const wallet_service_1 = require("../../wallet/wallet.service");
const transaction_service_1 = require("../../transaction/transaction.service");
const withdrawals_service_1 = require("../../withdrawals/withdrawals.service");
const escrow_service_1 = require("../../escrow/services/escrow.service");
const redis_service_1 = require("../../infrastructure/redis/redis.service");
const auction_status_enum_1 = require("../../auctions/enums/auction-status.enum");
let AdminAnalyticsService = class AdminAnalyticsService {
    usersService;
    auctionsService;
    walletService;
    transactionService;
    withdrawalsService;
    escrowService;
    redisService;
    constructor(usersService, auctionsService, walletService, transactionService, withdrawalsService, escrowService, redisService) {
        this.usersService = usersService;
        this.auctionsService = auctionsService;
        this.walletService = walletService;
        this.transactionService = transactionService;
        this.withdrawalsService = withdrawalsService;
        this.escrowService = escrowService;
        this.redisService = redisService;
    }
    async getDashboardStats() {
        const [totalUsers, verifiedUsersCount, activeAuctions, completedAuctions, cancelledAuctions, totalTransactions, totalWalletBalance, todaysRevenue, pendingWithdrawalsCount, pendingWithdrawalsAmount, totalCompletedPayouts, totalCollectedFees,] = await Promise.all([
            this.usersService.countAll({}),
            this.usersService.countVerifiedUsers(),
            this.auctionsService.countAuctions({ status: auction_status_enum_1.AuctionStatus.ACTIVE }),
            this.auctionsService.countAuctions({ status: auction_status_enum_1.AuctionStatus.ENDED }),
            this.auctionsService.countAuctions({
                status: auction_status_enum_1.AuctionStatus.CANCELLED,
            }),
            this.transactionService.countTransactions({}),
            this.walletService.sumAllBalances(),
            this.transactionService.sumTodayRevenue(),
            this.withdrawalsService.countPendingWithdrawals(),
            this.withdrawalsService.sumPendingWithdrawals(),
            this.withdrawalsService.sumCompletedWithdrawals(),
            this.withdrawalsService.sumCollectedFees(),
        ]);
        return {
            totalUsers,
            verifiedUsers: verifiedUsersCount,
            activeAuctions,
            completedAuctions,
            cancelledAuctions,
            totalWalletBalance,
            todaysRevenue,
            totalTransactions,
            pendingWithdrawalsCount,
            pendingWithdrawalsAmount,
            totalCompletedPayouts,
            totalCollectedFees,
        };
    }
    async getTreasuryStats() {
        const [totalWalletBalance, totalHeldInWallets, pendingWithdrawalsCount, totalPendingWithdrawals, totalHeldInEscrow, totalCompletedPayouts, totalCollectedFees,] = await Promise.all([
            this.walletService.sumAllBalances(),
            this.walletService.sumHeldBalances(),
            this.withdrawalsService.countPendingWithdrawals(),
            this.withdrawalsService.sumPendingWithdrawals(),
            this.escrowService.sumHeldEscrows(),
            this.withdrawalsService.sumCompletedWithdrawals(),
            this.withdrawalsService.sumCollectedFees(),
        ]);
        return {
            totalWalletBalance,
            totalHeldInWallets,
            totalPendingWithdrawals,
            pendingWithdrawalsCount,
            totalHeldInEscrow,
            totalCompletedPayouts,
            totalCollectedFees,
        };
    }
};
exports.AdminAnalyticsService = AdminAnalyticsService;
exports.AdminAnalyticsService = AdminAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auctions_service_1.AuctionsService,
        wallet_service_1.WalletService,
        transaction_service_1.TransactionService,
        withdrawals_service_1.WithdrawalsService,
        escrow_service_1.EscrowService,
        redis_service_1.RedisService])
], AdminAnalyticsService);
//# sourceMappingURL=admin-analytics.service.js.map