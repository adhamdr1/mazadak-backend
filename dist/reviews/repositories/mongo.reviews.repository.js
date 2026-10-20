"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoReviewsRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const review_entity_1 = require("../entities/review.entity");
const review_status_enum_1 = require("../enums/review-status.enum");
const review_type_enum_1 = require("../enums/review-type.enum");
const reviews_sort_field_enum_1 = require("../enums/reviews-sort-field.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let MongoReviewsRepository = class MongoReviewsRepository {
    reviewModel;
    constructor(reviewModel) {
        this.reviewModel = reviewModel;
    }
    async startSession() {
        return this.reviewModel.db.startSession();
    }
    async create(data, session) {
        const review = new this.reviewModel(data);
        return await review.save({ session });
    }
    async findById(id, session) {
        return await this.reviewModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .session(session || null)
            .exec();
    }
    async findByAuctionAndReviewer(auctionId, reviewerId, session) {
        return await this.reviewModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            reviewerId: new mongoose_2.Types.ObjectId(reviewerId),
        })
            .session(session || null)
            .exec();
    }
    async findByAuction(auctionId, session) {
        return await this.reviewModel
            .find({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
        })
            .session(session || null)
            .exec();
    }
    async findUserReviews(userId, filter, sort, page = 1, limit = 10, session) {
        const query = {
            reviewedUserId: new mongoose_2.Types.ObjectId(userId),
            status: review_status_enum_1.ReviewStatus.PUBLISHED,
        };
        if (filter?.type) {
            query.type = filter.type;
        }
        if (filter?.minRating) {
            query.overallRating = { $gte: filter.minRating };
        }
        const sortOptions = {};
        const direction = sort?.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        if (sort?.field === reviews_sort_field_enum_1.ReviewsSortField.RATING) {
            sortOptions.overallRating = direction;
            sortOptions.createdAt = -1;
        }
        else {
            sortOptions.createdAt = direction;
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.reviewModel
                .find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .session(session || null)
                .exec(),
            this.reviewModel
                .countDocuments(query)
                .session(session || null)
                .exec(),
        ]);
        return { items, total };
    }
    async findReviewsByReviewer(reviewerId, filter, sort, page = 1, limit = 10, session) {
        const query = {
            reviewerId: new mongoose_2.Types.ObjectId(reviewerId),
        };
        if (filter?.type) {
            query.type = filter.type;
        }
        if (filter?.minRating) {
            query.overallRating = { $gte: filter.minRating };
        }
        const sortOptions = {};
        const direction = sort?.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        if (sort?.field === reviews_sort_field_enum_1.ReviewsSortField.RATING) {
            sortOptions.overallRating = direction;
            sortOptions.createdAt = -1;
        }
        else {
            sortOptions.createdAt = direction;
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.reviewModel
                .find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .session(session || null)
                .exec(),
            this.reviewModel
                .countDocuments(query)
                .session(session || null)
                .exec(),
        ]);
        return { items, total };
    }
    async addReply(reviewId, replyText, session) {
        return await this.reviewModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(reviewId), {
            $set: {
                reply: replyText,
                repliedAt: new Date(),
            },
        }, { returnDocument: 'after', session: session || null })
            .exec();
    }
    async updateStatus(reviewId, status, publishedAt, session) {
        const updatePayload = { status };
        if (publishedAt) {
            updatePayload.publishedAt = publishedAt;
        }
        return await this.reviewModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(reviewId), { $set: updatePayload }, { returnDocument: 'after', session: session || null })
            .exec();
    }
    async getUserRatingStats(userId, session) {
        const aggregation = this.reviewModel.aggregate([
            {
                $match: {
                    reviewedUserId: new mongoose_2.Types.ObjectId(userId),
                    status: review_status_enum_1.ReviewStatus.PUBLISHED,
                },
            },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$overallRating' },
                    asSellerTotalReviews: {
                        $sum: {
                            $cond: [{ $eq: ['$type', review_type_enum_1.ReviewType.BUYER_TO_SELLER] }, 1, 0],
                        },
                    },
                    asSellerRatingSum: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', review_type_enum_1.ReviewType.BUYER_TO_SELLER] },
                                '$overallRating',
                                0,
                            ],
                        },
                    },
                    asBuyerTotalReviews: {
                        $sum: {
                            $cond: [{ $eq: ['$type', review_type_enum_1.ReviewType.SELLER_TO_BUYER] }, 1, 0],
                        },
                    },
                    asBuyerRatingSum: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', review_type_enum_1.ReviewType.SELLER_TO_BUYER] },
                                '$overallRating',
                                0,
                            ],
                        },
                    },
                    oneStar: {
                        $sum: { $cond: [{ $eq: ['$overallRating', 1] }, 1, 0] },
                    },
                    twoStar: {
                        $sum: { $cond: [{ $eq: ['$overallRating', 2] }, 1, 0] },
                    },
                    threeStar: {
                        $sum: { $cond: [{ $eq: ['$overallRating', 3] }, 1, 0] },
                    },
                    fourStar: {
                        $sum: { $cond: [{ $eq: ['$overallRating', 4] }, 1, 0] },
                    },
                    fiveStar: {
                        $sum: { $cond: [{ $eq: ['$overallRating', 5] }, 1, 0] },
                    },
                },
            },
        ]);
        if (session) {
            aggregation.session(session);
        }
        const results = await aggregation.exec();
        const result = results[0];
        if (!result || result.totalReviews === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                asSellerAverageRating: 0,
                asSellerTotalReviews: 0,
                asBuyerAverageRating: 0,
                asBuyerTotalReviews: 0,
                breakdown: {
                    oneStar: 0,
                    twoStar: 0,
                    threeStar: 0,
                    fourStar: 0,
                    fiveStar: 0,
                },
            };
        }
        const asSellerAverage = result.asSellerTotalReviews > 0
            ? Math.round((result.asSellerRatingSum / result.asSellerTotalReviews) * 10) / 10
            : 0;
        const asBuyerAverage = result.asBuyerTotalReviews > 0
            ? Math.round((result.asBuyerRatingSum / result.asBuyerTotalReviews) * 10) / 10
            : 0;
        return {
            averageRating: Math.round(result.averageRating * 10) / 10,
            totalReviews: result.totalReviews,
            asSellerAverageRating: asSellerAverage,
            asSellerTotalReviews: result.asSellerTotalReviews,
            asBuyerAverageRating: asBuyerAverage,
            asBuyerTotalReviews: result.asBuyerTotalReviews,
            breakdown: {
                oneStar: result.oneStar,
                twoStar: result.twoStar,
                threeStar: result.threeStar,
                fourStar: result.fourStar,
                fiveStar: result.fiveStar,
            },
        };
    }
    async findPendingReviewsOlderThan(thresholdDate, session) {
        return await this.reviewModel
            .find({
            status: review_status_enum_1.ReviewStatus.PENDING,
            createdAt: { $lte: thresholdDate },
        })
            .session(session || null)
            .exec();
    }
};
exports.MongoReviewsRepository = MongoReviewsRepository;
exports.MongoReviewsRepository = MongoReviewsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(review_entity_1.Review.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoReviewsRepository);
//# sourceMappingURL=mongo.reviews.repository.js.map