import { HydratedDocument, Types } from 'mongoose';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';
import { PayoutDetails } from '../dto/payout-details.type';
export type WithdrawalRequestDocument = HydratedDocument<WithdrawalRequest>;
export declare class WithdrawalRequest {
    readonly _id: Types.ObjectId;
    userId: Types.ObjectId;
    amount: Types.Decimal128;
    fee: Types.Decimal128;
    feePercentage: number;
    netAmount: Types.Decimal128;
    currency: string;
    payoutMethod: PayoutMethod;
    payoutDetails: PayoutDetails;
    status: WithdrawalStatus;
    holdTransactionId?: Types.ObjectId;
    completionTransactionId?: Types.ObjectId;
    adminReference?: string;
    receiptUrl?: string;
    rejectionReason?: string;
    processedBy?: Types.ObjectId;
    processedAt?: Date;
    completedAt?: Date;
    requestDate: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const WithdrawalRequestSchema: import("mongoose").Schema<WithdrawalRequest, import("mongoose").Model<WithdrawalRequest, any, any, any, any, any, WithdrawalRequest>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fee?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    feePercentage?: import("mongoose").SchemaDefinitionProperty<number, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    netAmount?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payoutMethod?: import("mongoose").SchemaDefinitionProperty<PayoutMethod, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payoutDetails?: import("mongoose").SchemaDefinitionProperty<PayoutDetails, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<WithdrawalStatus, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    holdTransactionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    completionTransactionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    adminReference?: import("mongoose").SchemaDefinitionProperty<string | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    receiptUrl?: import("mongoose").SchemaDefinitionProperty<string | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejectionReason?: import("mongoose").SchemaDefinitionProperty<string | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    processedBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    processedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    completedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    requestDate?: import("mongoose").SchemaDefinitionProperty<string, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, WithdrawalRequest, import("mongoose").Document<unknown, {}, WithdrawalRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WithdrawalRequest & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WithdrawalRequest>;
