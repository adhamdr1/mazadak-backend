import { HydratedDocument, Types } from 'mongoose';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionCategory } from '../enums/auction-category.enum';
export type AuctionDocument = HydratedDocument<Auction>;
export declare class Auction {
    readonly _id: Types.ObjectId;
    sellerId: Types.ObjectId;
    title: string;
    description: string;
    images: string[];
    category: AuctionCategory;
    startingPrice: Types.Decimal128;
    minimumBidIncrement: Types.Decimal128;
    currentPrice: Types.Decimal128;
    status: AuctionStatus;
    startTime: Date;
    endTime: Date;
    winnerId?: Types.ObjectId;
    isFinalized: boolean;
    adminActionReason?: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const AuctionSchema: import("mongoose").Schema<Auction, import("mongoose").Model<Auction, any, any, any, any, any, Auction>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Auction, import("mongoose").Document<unknown, {}, Auction, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sellerId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    images?: import("mongoose").SchemaDefinitionProperty<string[], Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<AuctionCategory, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startingPrice?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    minimumBidIncrement?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currentPrice?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<AuctionStatus, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startTime?: import("mongoose").SchemaDefinitionProperty<Date, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endTime?: import("mongoose").SchemaDefinitionProperty<Date, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    winnerId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isFinalized?: import("mongoose").SchemaDefinitionProperty<boolean, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    adminActionReason?: import("mongoose").SchemaDefinitionProperty<string | undefined, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Auction, import("mongoose").Document<unknown, {}, Auction, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Auction & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Auction>;
