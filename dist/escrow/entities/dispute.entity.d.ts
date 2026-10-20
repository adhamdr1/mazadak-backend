import { HydratedDocument, Types } from 'mongoose';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeReason } from '../enums/dispute-reason.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';
export type DisputeDocument = HydratedDocument<Dispute>;
export declare class Dispute {
    readonly _id: Types.ObjectId;
    escrowId: Types.ObjectId;
    auctionId: Types.ObjectId;
    openedById: Types.ObjectId;
    againstUserId: Types.ObjectId;
    reason: DisputeReason;
    description: string;
    evidenceUrls: string[];
    status: DisputeStatus;
    adminId?: Types.ObjectId;
    adminDecision?: DisputeResolution;
    adminNotes?: string;
    resolvedAt?: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const DisputeSchema: import("mongoose").Schema<Dispute, import("mongoose").Model<Dispute, any, any, any, any, any, Dispute>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    escrowId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    auctionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    openedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    againstUserId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<DisputeReason, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    evidenceUrls?: import("mongoose").SchemaDefinitionProperty<string[], Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<DisputeStatus, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    adminId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    adminDecision?: import("mongoose").SchemaDefinitionProperty<DisputeResolution | undefined, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    adminNotes?: import("mongoose").SchemaDefinitionProperty<string | undefined, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resolvedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Dispute, import("mongoose").Document<unknown, {}, Dispute, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Dispute & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Dispute>;
