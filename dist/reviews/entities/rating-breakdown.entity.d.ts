export declare class RatingBreakdown {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
}
export declare const RatingBreakdownSchema: import("mongoose").Schema<RatingBreakdown, import("mongoose").Model<RatingBreakdown, any, any, any, any, any, RatingBreakdown>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    oneStar?: import("mongoose").SchemaDefinitionProperty<number, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    twoStar?: import("mongoose").SchemaDefinitionProperty<number, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    threeStar?: import("mongoose").SchemaDefinitionProperty<number, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fourStar?: import("mongoose").SchemaDefinitionProperty<number, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fiveStar?: import("mongoose").SchemaDefinitionProperty<number, RatingBreakdown, import("mongoose").Document<unknown, {}, RatingBreakdown, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RatingBreakdown & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, RatingBreakdown>;
