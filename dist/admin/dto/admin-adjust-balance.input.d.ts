export declare enum AdminAdjustBalanceType {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT"
}
export declare class AdminAdjustBalanceInput {
    userId: string;
    amount: number;
    type: AdminAdjustBalanceType;
    reason: string;
}
