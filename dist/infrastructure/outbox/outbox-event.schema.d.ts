import { HydratedDocument } from 'mongoose';
import { RabbitMQEvent } from '../rabbitmq/rabbitmq-event.types';
export type OutboxEventDocument = HydratedDocument<OutboxEvent>;
export declare class OutboxEvent {
    messageId: string;
    eventType: RabbitMQEvent;
    version: string;
    payload: Record<string, unknown>;
    correlationId: string;
    publishedAt: Date | null;
    createdAt: Date;
}
export declare const OutboxEventSchema: import("mongoose").Schema<OutboxEvent, import("mongoose").Model<OutboxEvent, any, any, any, any, any, OutboxEvent>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    messageId?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    eventType?: import("mongoose").SchemaDefinitionProperty<RabbitMQEvent, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    version?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payload?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    correlationId?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    publishedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, OutboxEvent>;
