import { HydratedDocument, Types } from 'mongoose';
export type ChatReadStateDocument = HydratedDocument<ChatReadState>;
export declare class ChatReadState {
    readonly _id: Types.ObjectId;
    auctionId: Types.ObjectId;
    userId: Types.ObjectId;
    lastReadMessageId: Types.ObjectId | null;
    lastReadAt: Date | null;
}
export declare const ChatReadStateSchema: import("mongoose").Schema<ChatReadState, import("mongoose").Model<ChatReadState, any, any, any, any, any, ChatReadState>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    auctionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastReadMessageId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastReadAt?: import("mongoose").SchemaDefinitionProperty<Date | null, ChatReadState, import("mongoose").Document<unknown, {}, ChatReadState, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ChatReadState & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ChatReadState>;
