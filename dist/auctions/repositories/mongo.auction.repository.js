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
exports.MongoAuctionRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auction_entity_1 = require("../entities/auction.entity");
const auction_status_enum_1 = require("../enums/auction-status.enum");
const bid_entity_1 = require("../../bids/entities/bid.entity");
const bid_status_enum_1 = require("../../bids/enums/bid-status.enum");
let MongoAuctionRepository = class MongoAuctionRepository {
    auctionModel;
    bidModel;
    constructor(auctionModel, bidModel) {
        this.auctionModel = auctionModel;
        this.bidModel = bidModel;
    }
    async startSession() {
        return this.auctionModel.db.startSession();
    }
    async create(data) {
        const auction = new this.auctionModel({
            ...data,
            currentPrice: data.startingPrice,
        });
        return await auction.save();
    }
    async findById(id, session) {
        return await this.auctionModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .session(session || null)
            .exec();
    }
    async findAll(page, limit, filter, excludeStatuses) {
        const query = this.buildQuery(filter, excludeStatuses);
        const sort = this.buildSort(filter);
        return this.executePaginatedQuery(query, page, limit, sort);
    }
    async findBySellerId(sellerId, page, limit, filter) {
        const query = {
            ...this.buildQuery(filter),
            sellerId: new mongoose_2.Types.ObjectId(sellerId),
        };
        const sort = this.buildSort(filter);
        return this.executePaginatedQuery(query, page, limit, sort);
    }
    async findByWinnerId(winnerId, page, limit, filter) {
        const query = {
            ...this.buildQuery(filter),
            winnerId: new mongoose_2.Types.ObjectId(winnerId),
        };
        const sort = this.buildSort(filter);
        return this.executePaginatedQuery(query, page, limit, sort);
    }
    async update(id, data) {
        return await this.auctionModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: data }, { returnDocument: 'after' })
            .exec();
    }
    async updateStatus(id, status, session, adminActionReason) {
        const updatePayload = { status };
        if (adminActionReason) {
            updatePayload.adminActionReason = adminActionReason;
        }
        await this.auctionModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: updatePayload }, { session })
            .exec();
    }
    async updateManyStatus(ids, status) {
        await this.auctionModel
            .updateMany({ _id: { $in: ids } }, { $set: { status } })
            .exec();
    }
    async findPendingToActivate() {
        return await this.auctionModel
            .find({
            status: auction_status_enum_1.AuctionStatus.PENDING,
            startTime: { $lte: new Date() },
        })
            .exec();
    }
    async findActiveToEnd() {
        return await this.auctionModel
            .find({
            status: auction_status_enum_1.AuctionStatus.ACTIVE,
            endTime: { $lte: new Date() },
        })
            .exec();
    }
    async updateCurrentPrice(id, price, session) {
        await this.auctionModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: { currentPrice: price } }, { session })
            .exec();
    }
    async findEndedWithoutWinner() {
        return await this.auctionModel
            .find({
            status: auction_status_enum_1.AuctionStatus.ENDED,
            winnerId: null,
            isFinalized: false,
        })
            .exec();
    }
    async findActiveOrPendingBySellerId(sellerId, session) {
        return await this.auctionModel
            .find({
            sellerId: new mongoose_2.Types.ObjectId(sellerId),
            status: { $in: [auction_status_enum_1.AuctionStatus.PENDING, auction_status_enum_1.AuctionStatus.ACTIVE] },
        })
            .session(session || null)
            .exec();
    }
    async finalizeAuction(id, winnerId, session) {
        const updateQuery = { isFinalized: true };
        if (winnerId) {
            updateQuery.winnerId = new mongoose_2.Types.ObjectId(winnerId);
        }
        await this.auctionModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: updateQuery }, { session })
            .exec();
    }
    buildQuery(filter, excludeStatuses) {
        const query = {};
        if (filter.category)
            query.category = filter.category;
        if (filter.status) {
            query.status = filter.status;
        }
        else if (excludeStatuses && excludeStatuses.length > 0) {
            query.status = { $nin: excludeStatuses };
        }
        if (filter.search && filter.search.trim()) {
            const sanitizedSearch = filter.search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: sanitizedSearch, $options: 'i' } },
                { description: { $regex: sanitizedSearch, $options: 'i' } },
            ];
        }
        if (filter.startDate || filter.endDate) {
            const createdAtQuery = {};
            if (filter.startDate)
                createdAtQuery['$gte'] = filter.startDate;
            if (filter.endDate) {
                const end = new Date(filter.endDate);
                end.setHours(23, 59, 59, 999);
                createdAtQuery['$lte'] = end;
            }
            query['createdAt'] = createdAtQuery;
        }
        return query;
    }
    buildSort(filter) {
        const sortParams = {};
        if (filter.sort) {
            sortParams[filter.sort.field] = filter.sort.order === 'ASC' ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        return sortParams;
    }
    async executePaginatedQuery(query, page, limit, sort) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.auctionModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
            this.auctionModel.countDocuments(query).exec(),
        ]);
        return { items, total };
    }
    async findWinningBidByAuctionId(auctionId, session) {
        const winningBid = await this.bidModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            status: bid_status_enum_1.BidStatus.WINNING,
        }, null, { session })
            .exec();
        if (!winningBid)
            return null;
        return {
            bidderId: winningBid.bidderId.toString(),
            amount: Number(winningBid.amount.toString()),
        };
    }
    async count(filter, excludeStatuses) {
        const query = this.buildQuery(filter, excludeStatuses);
        return await this.auctionModel.countDocuments(query).exec();
    }
    async countUserAuctions(sellerId) {
        const [active, completed] = await Promise.all([
            this.auctionModel
                .countDocuments({
                sellerId: new mongoose_2.Types.ObjectId(sellerId),
                status: auction_status_enum_1.AuctionStatus.ACTIVE,
            })
                .exec(),
            this.auctionModel
                .countDocuments({
                sellerId: new mongoose_2.Types.ObjectId(sellerId),
                status: auction_status_enum_1.AuctionStatus.ENDED,
            })
                .exec(),
        ]);
        return { active, completed };
    }
    async findEndedParticipantAuctionIds(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const auctions = await this.auctionModel
            .find({
            status: auction_status_enum_1.AuctionStatus.ENDED,
            winnerId: { $exists: true, $ne: null },
            $or: [{ sellerId: userObjectId }, { winnerId: userObjectId }],
        }, { _id: 1 })
            .lean()
            .exec();
        return auctions.map((a) => a._id);
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        return await this.auctionModel.find({ _id: { $in: ids } }).exec();
    }
};
exports.MongoAuctionRepository = MongoAuctionRepository;
exports.MongoAuctionRepository = MongoAuctionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(auction_entity_1.Auction.name)),
    __param(1, (0, mongoose_1.InjectModel)(bid_entity_1.Bid.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MongoAuctionRepository);
//# sourceMappingURL=mongo.auction.repository.js.map