import { HydratedDocument, Types } from 'mongoose';
import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { NotificationCategory } from '../enums/notification-category.enum';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';
export type InAppNotificationDocument = HydratedDocument<InAppNotification>;
export declare class InAppNotification {
    readonly _id: Types.ObjectId;
    userId: Types.ObjectId;
    type: InAppNotificationType;
    category: NotificationCategory;
    title: string;
    body: string;
    isRead: boolean;
    referenceId: string | null;
    referenceType: NotificationReferenceType | null;
    readonly createdAt: Date;
}
export declare const InAppNotificationSchema: import("mongoose").Schema<InAppNotification, import("mongoose").Model<InAppNotification, any, any, any, any, any, InAppNotification>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    readonly _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<InAppNotificationType, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<NotificationCategory, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    body?: import("mongoose").SchemaDefinitionProperty<string, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isRead?: import("mongoose").SchemaDefinitionProperty<boolean, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    referenceId?: import("mongoose").SchemaDefinitionProperty<string | null, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    referenceType?: import("mongoose").SchemaDefinitionProperty<NotificationReferenceType | null, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readonly createdAt?: import("mongoose").SchemaDefinitionProperty<Date, InAppNotification, import("mongoose").Document<unknown, {}, InAppNotification, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InAppNotification & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, InAppNotification>;
