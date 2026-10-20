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
exports.MongoDisputeRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const entities_1 = require("../entities");
const user_entity_1 = require("../../users/entities/user.entity");
let MongoDisputeRepository = class MongoDisputeRepository {
    disputeModel;
    userModel;
    constructor(disputeModel, userModel) {
        this.disputeModel = disputeModel;
        this.userModel = userModel;
    }
    async startSession() {
        return this.disputeModel.db.startSession();
    }
    async create(data, session) {
        const dispute = new this.disputeModel(data);
        return await dispute.save({ session });
    }
    async findById(id, session) {
        return await this.disputeModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .session(session || null)
            .exec();
    }
    async findByEscrowId(escrowId, session) {
        return await this.disputeModel
            .findOne({ escrowId: new mongoose_2.Types.ObjectId(escrowId) })
            .session(session || null)
            .exec();
    }
    async findByAuctionId(auctionId, session) {
        return await this.disputeModel
            .findOne({ auctionId: new mongoose_2.Types.ObjectId(auctionId) })
            .session(session || null)
            .exec();
    }
    async updateStatus(id, status, extra, session) {
        const updatePayload = { status };
        if (extra?.adminId !== undefined) {
            updatePayload.adminId = extra.adminId;
        }
        if (extra?.adminDecision !== undefined) {
            updatePayload.adminDecision = extra.adminDecision;
        }
        if (extra?.adminNotes !== undefined) {
            updatePayload.adminNotes = extra.adminNotes;
        }
        if (extra?.resolvedAt !== undefined) {
            updatePayload.resolvedAt = extra.resolvedAt;
        }
        return await this.disputeModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), { $set: updatePayload }, { new: true, session: session || null })
            .exec();
    }
    async findPaginated(filter, page = 1, limit = 10, session) {
        const query = {};
        if (filter?.status) {
            query.status = filter.status;
        }
        if (filter?.auctionId) {
            query.auctionId = new mongoose_2.Types.ObjectId(filter.auctionId);
        }
        if (filter?.openedById) {
            query.openedById = new mongoose_2.Types.ObjectId(filter.openedById);
        }
        if (filter?.againstUserId) {
            query.againstUserId = new mongoose_2.Types.ObjectId(filter.againstUserId);
        }
        if (filter?.userId) {
            const userObjectId = new mongoose_2.Types.ObjectId(filter.userId);
            query.$or = [
                { openedById: userObjectId },
                { againstUserId: userObjectId },
            ];
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
            this.disputeModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .session(session || null)
                .exec(),
            this.disputeModel
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
            { description: { $regex: searchRegex } },
            { reason: { $regex: searchRegex } },
        ];
        const cleanHex = trimmed.replace(/^#/, '');
        const isHex = /^[0-9a-fA-F]+$/.test(cleanHex);
        if (isHex) {
            if (cleanHex.length === 24) {
                const exactObjectId = new mongoose_2.Types.ObjectId(cleanHex);
                searchOrConditions.push({ _id: exactObjectId }, { auctionId: exactObjectId }, { escrowId: exactObjectId }, { openedById: exactObjectId }, { againstUserId: exactObjectId });
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
                }, {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$escrowId' },
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
            searchOrConditions.push({ openedById: { $in: matchedUserIds } }, { againstUserId: { $in: matchedUserIds } });
        }
        if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchOrConditions }];
            delete query.$or;
        }
        else {
            query.$or = searchOrConditions;
        }
    }
};
exports.MongoDisputeRepository = MongoDisputeRepository;
exports.MongoDisputeRepository = MongoDisputeRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(entities_1.Dispute.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_entity_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MongoDisputeRepository);
//# sourceMappingURL=mongo.dispute.repository.js.map