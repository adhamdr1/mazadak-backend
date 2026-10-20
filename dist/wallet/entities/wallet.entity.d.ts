import { HydratedDocument, Types } from 'mongoose';
export type WalletDocument = HydratedDocument<Wallet>;
export declare class Wallet {
    readonly _id: Types.ObjectId;
    userId: Types.ObjectId;
    balance: Types.Decimal128;
    heldBalance: Types.Decimal128;
    availableBalance: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const WalletSchema: import("mongoose").Schema<Wallet, import("mongoose").Model<Wallet, any, any, any, any, any, Wallet>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    balance?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    heldBalance?: import("mongoose").SchemaDefinitionProperty<Types.Decimal128, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    availableBalance?: import("mongoose").SchemaDefinitionProperty<string, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Wallet, import("mongoose").Document<unknown, {}, Wallet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Wallet & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Wallet>;
