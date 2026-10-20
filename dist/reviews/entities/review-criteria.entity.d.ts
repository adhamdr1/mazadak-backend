export declare class ReviewCriteria {
    itemAccuracy?: number;
    communication?: number;
    packaging?: number;
    smoothExperience?: number;
}
export declare const ReviewCriteriaSchema: import("mongoose").Schema<ReviewCriteria, import("mongoose").Model<ReviewCriteria, any, any, any, any, any, ReviewCriteria>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewCriteria, import("mongoose").Document<unknown, {}, ReviewCriteria, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewCriteria & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    itemAccuracy?: import("mongoose").SchemaDefinitionProperty<number | undefined, ReviewCriteria, import("mongoose").Document<unknown, {}, ReviewCriteria, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewCriteria & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    communication?: import("mongoose").SchemaDefinitionProperty<number | undefined, ReviewCriteria, import("mongoose").Document<unknown, {}, ReviewCriteria, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewCriteria & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    packaging?: import("mongoose").SchemaDefinitionProperty<number | undefined, ReviewCriteria, import("mongoose").Document<unknown, {}, ReviewCriteria, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewCriteria & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    smoothExperience?: import("mongoose").SchemaDefinitionProperty<number | undefined, ReviewCriteria, import("mongoose").Document<unknown, {}, ReviewCriteria, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewCriteria & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ReviewCriteria>;
