import { HydratedDocument, Types } from 'mongoose';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';
export type AutoBidDocument = HydratedDocument<AutoBid>;
export declare class AutoBid {
    readonly _id: Types.ObjectId;
    auctionId: Types.ObjectId;
    userId: Types.ObjectId;
    maxAmount: Types.Decimal128;
    status: AutoBidStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const AutoBidSchema: import("mongoose").Schema<AutoBid, import("mongoose").Model<AutoBid, any, any, any, any, any, AutoBid>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    auctionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    maxAmount?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<AutoBidStatus, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, AutoBid, import("mongoose").Document<unknown, {}, AutoBid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AutoBid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, AutoBid>;
