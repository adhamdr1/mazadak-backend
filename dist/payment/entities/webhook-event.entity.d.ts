import { HydratedDocument } from 'mongoose';
export type WebhookEventDocument = HydratedDocument<WebhookEvent>;
import { PaymentProviderType } from '../enums/payment-provider-type.enum';
export declare class WebhookEvent {
    providerEventId: string;
    provider: PaymentProviderType;
    payload: Record<string, unknown>;
    providerSignature: string;
    processed: boolean;
    processedAt: Date | null;
    retryCount: number;
    errorMessage: string | null;
    receivedAt: Date;
}
export declare const WebhookEventSchema: import("mongoose").Schema<WebhookEvent, import("mongoose").Model<WebhookEvent, any, any, any, any, any, WebhookEvent>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    providerEventId?: import("mongoose").SchemaDefinitionProperty<string, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<PaymentProviderType, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payload?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    providerSignature?: import("mongoose").SchemaDefinitionProperty<string, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    processed?: import("mongoose").SchemaDefinitionProperty<boolean, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    processedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    retryCount?: import("mongoose").SchemaDefinitionProperty<number, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    errorMessage?: import("mongoose").SchemaDefinitionProperty<string | null, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    receivedAt?: import("mongoose").SchemaDefinitionProperty<Date, WebhookEvent, import("mongoose").Document<unknown, {}, WebhookEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WebhookEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WebhookEvent>;
