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
exports.MongoAutoBidRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auto_bid_entity_1 = require("../entities/auto-bid.entity");
const auto_bid_status_enum_1 = require("../enums/auto-bid-status.enum");
let MongoAutoBidRepository = class MongoAutoBidRepository {
    autoBidModel;
    constructor(autoBidModel) {
        this.autoBidModel = autoBidModel;
    }
    async startSession() {
        return await this.autoBidModel.db.startSession();
    }
    async findActiveByAuctionId(auctionId, session) {
        const docs = await this.autoBidModel
            .find({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        })
            .sort({ maxAmount: -1, createdAt: 1 })
            .session(session ?? null)
            .exec();
        return docs.map((d) => d.toObject());
    }
    async findByAuctionAndUser(auctionId, userId, session) {
        const doc = await this.autoBidModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            userId: new mongoose_2.Types.ObjectId(userId),
        }, null, { session })
            .exec();
        return doc ? doc.toObject() : null;
    }
    async findActiveByAuctionAndUser(auctionId, userId, session) {
        const doc = await this.autoBidModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            userId: new mongoose_2.Types.ObjectId(userId),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        }, null, { session })
            .exec();
        return doc ? doc.toObject() : null;
    }
    async findActiveByAuctionAndMaxAmount(auctionId, maxAmount, session) {
        const doc = await this.autoBidModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            maxAmount: mongoose_2.Types.Decimal128.fromString(maxAmount.toFixed(2)),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        }, null, { session })
            .exec();
        return doc ? doc.toObject() : null;
    }
    async upsert(data, session) {
        const doc = await this.autoBidModel
            .findOneAndUpdate({
            auctionId: new mongoose_2.Types.ObjectId(data.auctionId),
            userId: new mongoose_2.Types.ObjectId(data.userId),
        }, {
            $set: {
                maxAmount: mongoose_2.Types.Decimal128.fromString(data.maxAmount.toFixed(2)),
                status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
            },
        }, {
            returnDocument: 'after',
            upsert: true,
            session,
            setDefaultsOnInsert: true,
        })
            .exec();
        return doc ? doc.toObject() : null;
    }
    async updateStatus(autoBidId, status, session) {
        await this.autoBidModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(autoBidId), { $set: { status } }, { session, returnDocument: 'after' })
            .exec();
    }
    async cancel(auctionId, userId, session) {
        const doc = await this.autoBidModel
            .findOneAndUpdate({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            userId: new mongoose_2.Types.ObjectId(userId),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        }, {
            $set: { status: auto_bid_status_enum_1.AutoBidStatus.CANCELLED },
        }, {
            returnDocument: 'after',
            session,
        })
            .exec();
        return doc ? doc.toObject() : null;
    }
    async findByUserId(userId, page = 1, limit = 10, status) {
        const skip = (page - 1) * limit;
        const query = {
            userId: new mongoose_2.Types.ObjectId(userId),
        };
        if (status) {
            query.status = status;
        }
        const [docs, total] = await Promise.all([
            this.autoBidModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.autoBidModel.countDocuments(query).exec(),
        ]);
        return { items: docs.map((d) => d.toObject()), total };
    }
    async deactivateAllForAuction(auctionId, targetStatus = auto_bid_status_enum_1.AutoBidStatus.EXHAUSTED, session) {
        await this.autoBidModel
            .updateMany({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        }, {
            $set: { status: targetStatus },
        }, { session })
            .exec();
    }
    async countActiveByAuction(auctionId, session) {
        return await this.autoBidModel
            .countDocuments({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            status: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        }, { session })
            .exec();
    }
};
exports.MongoAutoBidRepository = MongoAutoBidRepository;
exports.MongoAutoBidRepository = MongoAutoBidRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(auto_bid_entity_1.AutoBid.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoAutoBidRepository);
//# sourceMappingURL=mongo.auto-bid.repository.js.map