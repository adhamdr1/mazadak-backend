import { HydratedDocument, Types } from 'mongoose';
import { BidStatus } from '../enums/bid-status.enum';
export type BidDocument = HydratedDocument<Bid>;
export declare class Bid {
    readonly _id: Types.ObjectId;
    auctionId: Types.ObjectId;
    bidderId: Types.ObjectId;
    amount: Types.Decimal128;
    status: BidStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const BidSchema: import("mongoose").Schema<Bid, import("mongoose").Model<Bid, any, any, any, any, any, Bid>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Bid, import("mongoose").Document<unknown, {}, Bid, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    auctionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    bidderId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<BidStatus, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Bid, import("mongoose").Document<unknown, {}, Bid, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Bid & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Bid>;
