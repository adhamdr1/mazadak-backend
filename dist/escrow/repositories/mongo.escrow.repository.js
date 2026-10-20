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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoEscrowRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const entities_1 = require("../entities");
const user_entity_1 = require("../../users/entities/user.entity");
const enums_1 = require("../enums");
const decimal_js_1 = __importDefault(require("decimal.js"));
let MongoEscrowRepository = class MongoEscrowRepository {
    escrowModel;
    userModel;
    constructor(escrowModel, userModel) {
        this.escrowModel = escrowModel;
        this.userModel = userModel;
    }
    async startSession() {
        return this.escrowModel.db.startSession();
    }
    async create(data, session) {
        const escrow = new this.escrowModel(data);
        return await escrow.save({ session });
    }
    async findById(id, session) {
        return await this.escrowModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .session(session || null)
            .exec();
    }
    async findByAuctionId(auctionId, session) {
        return await this.escrowModel
            .findOne({ auctionId: new mongoose_2.Types.ObjectId(auctionId) })
            .session(session || null)
            .exec();
    }
    async findExpiredHeldEscrows(now, limit = 50, session) {
        return await this.escrowModel
            .find({
            status: enums_1.EscrowStatus.HELD,
            inspectionPeriodEndsAt: { $lte: now },
        })
            .limit(limit)
            .session(session || null)
            .exec();
    }
    async updateStatus(id, status, extra, session) {
        const updatePayload = { status };
        if (extra?.releasedAt !== undefined) {
            updatePayload.releasedAt = extra.releasedAt;
        }
        if (extra?.refundedAt !== undefined) {
            updatePayload.refundedAt = extra.refundedAt;
        }
        if (extra?.releaseReason !== undefined) {
            updatePayload.releaseReason = extra.releaseReason;
        }
        if (extra?.disputeId !== undefined) {
            updatePayload.disputeId = extra.disputeId;
        }
        return await this.escrowModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: updatePayload }, { new: true, session: session || null })
            .exec();
    }
    async findPaginated(filter, page = 1, limit = 10, session) {
        const query = {};
        if (filter?.status) {
            query.status = filter.status;
        }
        else if (filter?.excludeDisputed) {
            query.status = { $ne: enums_1.EscrowStatus.DISPUTED };
        }
        if (filter?.auctionId) {
            query.auctionId = new mongoose_2.Types.ObjectId(filter.auctionId);
        }
        if (filter?.buyerId) {
            query.buyerId = new mongoose_2.Types.ObjectId(filter.buyerId);
        }
        if (filter?.sellerId) {
            query.sellerId = new mongoose_2.Types.ObjectId(filter.sellerId);
        }
        if (filter?.userId) {
            const userObjectId = new mongoose_2.Types.ObjectId(filter.userId);
            query.$or = [{ buyerId: userObjectId }, { sellerId: userObjectId }];
        }
        if (filter?.search) {
            await this.applySearchFilter(query, filter.search, session);
        }
        if (filter?.startDate || filter?.endDate) {
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
        const safePage = page > 0 ? page : 1;
        const safeLimit = limit > 0 ? limit : 10;
        const skip = (safePage - 1) * safeLimit;
        const [items, total] = await Promise.all([
            this.escrowModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .session(session || null)
                .exec(),
            this.escrowModel
                .countDocuments(query)
                .session(session || null)
                .exec(),
        ]);
        return { items, total };
    }
    async applySearchFilter(query, search, session) {
        const trimmed = search.trim();
        if (!trimmed)
            return;
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');
        const searchOrConditions = [
            { releaseReason: { $regex: searchRegex } },
        ];
        const cleanHex = trimmed.replace(/^#/, '');
        const isHex = /^[0-9a-fA-F]+$/.test(cleanHex);
        if (isHex) {
            if (cleanHex.length === 24) {
                const exactObjectId = new mongoose_2.Types.ObjectId(cleanHex);
                searchOrConditions.push({ _id: exactObjectId }, { auctionId: exactObjectId }, { buyerId: exactObjectId }, { sellerId: exactObjectId }, { disputeId: exactObjectId });
            }
            else if (cleanHex.length >= 3) {
                searchOrConditions.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: cleanHex,
                            options: 'i',
                        },
                    },
                }, {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$auctionId' },
                            regex: cleanHex,
                            options: 'i',
                        },
                    },
                });
            }
        }
        const userOrConditions = [
            { firstName: { $regex: searchRegex } },
            { lastName: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { phoneNumber: { $regex: searchRegex } },
        ];
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
            const firstEscaped = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const restEscaped = parts
                .slice(1)
                .join(' ')
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            userOrConditions.push({
                $and: [
                    { firstName: { $regex: new RegExp(firstEscaped, 'i') } },
                    { lastName: { $regex: new RegExp(restEscaped, 'i') } },
                ],
            });
            userOrConditions.push({
                $and: [
                    { firstName: { $regex: new RegExp(restEscaped, 'i') } },
                    { lastName: { $regex: new RegExp(firstEscaped, 'i') } },
                ],
            });
        }
        const matchedUsers = await this.userModel
            .find({
            deletedAt: null,
            $or: userOrConditions,
        })
            .select('_id')
            .limit(50)
            .session(session || null)
            .lean()
            .exec();
        if (matchedUsers.length > 0) {
            const matchedUserIds = matchedUsers.map((u) => u._id);
            searchOrConditions.push({ buyerId: { $in: matchedUserIds } }, { sellerId: { $in: matchedUserIds } });
        }
        if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchOrConditions }];
            delete query.$or;
        }
        else {
            query.$or = searchOrConditions;
        }
    }
    async sumHeldEscrows() {
        const result = await this.escrowModel.aggregate([
            {
                $match: {
                    status: { $in: [enums_1.EscrowStatus.HELD, enums_1.EscrowStatus.DISPUTED] },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);
        return result.length > 0 && result[0].total
            ? new decimal_js_1.default(result[0].total.toString()).toNumber()
            : 0;
    }
};
exports.MongoEscrowRepository = MongoEscrowRepository;
exports.MongoEscrowRepository = MongoEscrowRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(entities_1.Escrow.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_entity_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MongoEscrowRepository);
//# sourceMappingURL=mongo.escrow.repository.js.map