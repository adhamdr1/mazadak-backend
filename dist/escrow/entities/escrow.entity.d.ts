import { HydratedDocument, Types } from 'mongoose';
import { EscrowStatus } from '../enums/escrow-status.enum';
export type EscrowDocument = HydratedDocument<Escrow>;
export declare class Escrow {
    readonly _id: Types.ObjectId;
    auctionId: Types.ObjectId;
    buyerId: Types.ObjectId;
    sellerId: Types.ObjectId;
    amount: Types.Decimal128;
    currency: string;
    status: EscrowStatus;
    inspectionPeriodEndsAt: Date;
    inspectionDurationHours?: number;
    releasedAt?: Date;
    refundedAt?: Date;
    disputeId?: Types.ObjectId;
    releaseReason?: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const EscrowSchema: import("mongoose").Schema<Escrow, import("mongoose").Model<Escrow, any, any, any, any, any, Escrow>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    auctionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    buyerId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sellerId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<EscrowStatus, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    inspectionPeriodEndsAt?: import("mongoose").SchemaDefinitionProperty<Date, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    inspectionDurationHours?: import("mongoose").SchemaDefinitionProperty<number | undefined, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    releasedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    refundedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    disputeId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    releaseReason?: import("mongoose").SchemaDefinitionProperty<string | undefined, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Escrow, import("mongoose").Document<unknown, {}, Escrow, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Escrow & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Escrow>;
