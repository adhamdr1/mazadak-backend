import { RatingBreakdown } from './rating-breakdown.entity';
export declare class UserRatingStats {
    averageRating: number;
    totalReviews: number;
    asSellerAverageRating: number;
    asSellerTotalReviews: number;
    asBuyerAverageRating: number;
    asBuyerTotalReviews: number;
    breakdown: RatingBreakdown;
}
export declare const UserRatingStatsSchema: import("mongoose").Schema<UserRatingStats, import("mongoose").Model<UserRatingStats, any, any, any, any, any, UserRatingStats>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    averageRating?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalReviews?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    asSellerAverageRating?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    asSellerTotalReviews?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    asBuyerAverageRating?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    asBuyerTotalReviews?: import("mongoose").SchemaDefinitionProperty<number, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    breakdown?: import("mongoose").SchemaDefinitionProperty<RatingBreakdown, UserRatingStats, import("mongoose").Document<unknown, {}, UserRatingStats, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserRatingStats & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, UserRatingStats>;
