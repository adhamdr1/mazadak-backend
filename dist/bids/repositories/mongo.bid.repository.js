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
exports.MongoBidRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bid_entity_1 = require("../entities/bid.entity");
const bid_status_enum_1 = require("../enums/bid-status.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let MongoBidRepository = class MongoBidRepository {
    bidModel;
    constructor(bidModel) {
        this.bidModel = bidModel;
    }
    async startSession() {
        return await this.bidModel.db.startSession();
    }
    async create(data, session) {
        const bids = await this.bidModel.create([data], { session });
        return bids[0].toObject();
    }
    async findWinningByAuctionId(auctionId, session) {
        const bid = await this.bidModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            status: bid_status_enum_1.BidStatus.WINNING,
        }, null, { session })
            .lean()
            .exec();
        return bid;
    }
    async findAll(page, limit, filter) {
        const skip = (page - 1) * limit;
        const query = filter?.status
            ? { status: filter.status }
            : {};
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] =
                filter.sort.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        const [items, total] = await Promise.all([
            this.bidModel
                .find(query)
                .sort(sortParams)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.bidModel.countDocuments(query).exec(),
        ]);
        return { items, total };
    }
    async findByAuctionId(auctionId, page, limit, filter) {
        const skip = (page - 1) * limit;
        const query = {
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
        };
        if (filter?.status) {
            query.status = filter.status;
        }
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] =
                filter.sort.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        }
        else {
            sortParams['amount'] = -1;
            sortParams['createdAt'] = -1;
        }
        const [items, total] = await Promise.all([
            this.bidModel
                .find(query)
                .sort(sortParams)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.bidModel.countDocuments(query).exec(),
        ]);
        return { items, total };
    }
    async findByBidderId(bidderId, page, limit, filter) {
        const skip = (page - 1) * limit;
        const query = {
            bidderId: new mongoose_2.Types.ObjectId(bidderId),
        };
        if (filter?.status) {
            query.status = filter.status;
        }
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] =
                filter.sort.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        const [items, total] = await Promise.all([
            this.bidModel
                .find(query)
                .sort(sortParams)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.bidModel.countDocuments(query).exec(),
        ]);
        return { items, total };
    }
    async updateStatus(bidId, status, session) {
        await this.bidModel
            .findByIdAndUpdate(bidId, { status }, { session, returnDocument: 'after' })
            .exec();
    }
    async countByAuctionId(auctionId) {
        return this.bidModel
            .countDocuments({ auctionId: new mongoose_2.Types.ObjectId(auctionId) })
            .exec();
    }
};
exports.MongoBidRepository = MongoBidRepository;
exports.MongoBidRepository = MongoBidRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bid_entity_1.Bid.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoBidRepository);
//# sourceMappingURL=mongo.bid.repository.js.map