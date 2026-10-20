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
exports.MongoWithdrawalRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const decimal_js_1 = __importDefault(require("decimal.js"));
const withdrawal_request_entity_1 = require("../entities/withdrawal-request.entity");
const withdrawal_status_enum_1 = require("../enums/withdrawal-status.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let MongoWithdrawalRepository = class MongoWithdrawalRepository {
    withdrawalModel;
    constructor(withdrawalModel) {
        this.withdrawalModel = withdrawalModel;
    }
    getTodayDateInCairo(date = new Date()) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Cairo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    async queryPaginated(baseQuery, pagination, filter, session) {
        const query = { ...baseQuery };
        if (filter?.status) {
            query.status = filter.status;
        }
        if (filter?.payoutMethod) {
            query.payoutMethod = filter.payoutMethod;
        }
        if (filter?.userId && !baseQuery.userId) {
            if (mongoose_2.Types.ObjectId.isValid(filter.userId)) {
                query.userId = new mongoose_2.Types.ObjectId(filter.userId);
            }
        }
        if (filter?.search) {
            const trimmedSearch = filter.search.trim();
            if (trimmedSearch.length > 0) {
                const escaped = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'i');
                const orConditions = [
                    { 'payoutDetails.accountHolderName': regex },
                    { 'payoutDetails.phoneNumber': regex },
                    { 'payoutDetails.iban': regex },
                    { 'payoutDetails.accountNumber': regex },
                    { 'payoutDetails.walletNumber': regex },
                    { 'payoutDetails.ipaAddress': regex },
                    { adminReference: regex },
                ];
                if (mongoose_2.Types.ObjectId.isValid(trimmedSearch)) {
                    orConditions.push({ _id: new mongoose_2.Types.ObjectId(trimmedSearch) });
                }
                query.$or = orConditions;
            }
        }
        if (filter?.startDate || filter?.endDate) {
            const createdAtQuery = {};
            if (filter.startDate) {
                createdAtQuery.$gte = filter.startDate;
            }
            if (filter.endDate) {
                const end = new Date(filter.endDate);
                end.setHours(23, 59, 59, 999);
                createdAtQuery.$lte = end;
            }
            query.createdAt = createdAtQuery;
        }
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const sortDirection = filter?.sortOrder === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        const [items, total] = await Promise.all([
            this.withdrawalModel
                .find(query)
                .sort({ createdAt: sortDirection })
                .skip(skip)
                .limit(limit)
                .session(session || null)
                .exec(),
            this.withdrawalModel
                .countDocuments(query)
                .session(session || null)
                .exec(),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async create(data, session) {
        const requestDate = data.requestDate || this.getTodayDateInCairo();
        const request = new this.withdrawalModel({
            userId: new mongoose_2.Types.ObjectId(data.userId),
            amount: mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(data.amount).toString()),
            fee: mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(data.fee).toString()),
            feePercentage: data.feePercentage,
            netAmount: mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(data.netAmount).toString()),
            currency: data.currency || 'EGP',
            payoutMethod: data.payoutMethod,
            payoutDetails: data.payoutDetails,
            status: data.status || withdrawal_status_enum_1.WithdrawalStatus.PENDING,
            holdTransactionId: data.holdTransactionId,
            requestDate,
        });
        return await request.save({ session });
    }
    async findById(id, session) {
        return await this.withdrawalModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .session(session || null)
            .exec();
    }
    async findByUserId(userId, pagination, filter, session) {
        return this.queryPaginated({ userId: new mongoose_2.Types.ObjectId(userId) }, pagination, filter, session);
    }
    async findAll(pagination, filter, session) {
        return this.queryPaginated({}, pagination, filter, session);
    }
    async updateStatus(id, status, extra, session) {
        return await this.withdrawalModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(id), {
            $set: {
                status,
                ...extra,
            },
        }, { returnDocument: 'after', session: session || null })
            .exec();
    }
    async transitionStatus(id, fromStatuses, toStatus, extra, session, filter) {
        const query = {
            _id: new mongoose_2.Types.ObjectId(id),
            status: { $in: fromStatuses },
        };
        if (filter?.userId) {
            query.userId = new mongoose_2.Types.ObjectId(filter.userId);
        }
        return await this.withdrawalModel
            .findOneAndUpdate(query, {
            $set: {
                status: toStatus,
                ...extra,
            },
        }, { returnDocument: 'after', session: session || null })
            .exec();
    }
    async hasActivePendingRequest(userId, session) {
        const count = await this.withdrawalModel
            .countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            status: {
                $in: [withdrawal_status_enum_1.WithdrawalStatus.PENDING, withdrawal_status_enum_1.WithdrawalStatus.PROCESSING],
            },
        })
            .session(session || null)
            .exec();
        return count > 0;
    }
    async hasRequestToday(userId, session) {
        const today = this.getTodayDateInCairo();
        const count = await this.withdrawalModel
            .countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            requestDate: today,
            status: {
                $in: [
                    withdrawal_status_enum_1.WithdrawalStatus.PENDING,
                    withdrawal_status_enum_1.WithdrawalStatus.PROCESSING,
                    withdrawal_status_enum_1.WithdrawalStatus.COMPLETED,
                ],
            },
        })
            .session(session || null)
            .exec();
        return count > 0;
    }
    async countPendingWithdrawals(session) {
        return await this.withdrawalModel
            .countDocuments({
            status: withdrawal_status_enum_1.WithdrawalStatus.PENDING,
        })
            .session(session || null)
            .exec();
    }
    async sumPendingWithdrawals(session) {
        const result = await this.withdrawalModel
            .aggregate([
            {
                $match: {
                    status: {
                        $in: [withdrawal_status_enum_1.WithdrawalStatus.PENDING, withdrawal_status_enum_1.WithdrawalStatus.PROCESSING],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ])
            .session(session || null);
        return result.length > 0 && result[0].total
            ? new decimal_js_1.default(result[0].total.toString()).toNumber()
            : 0;
    }
    async sumCompletedWithdrawals(session) {
        const result = await this.withdrawalModel
            .aggregate([
            {
                $match: {
                    status: withdrawal_status_enum_1.WithdrawalStatus.COMPLETED,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ])
            .session(session || null);
        return result.length > 0 && result[0].total
            ? new decimal_js_1.default(result[0].total.toString()).toNumber()
            : 0;
    }
    async sumCollectedFees(session) {
        const result = await this.withdrawalModel
            .aggregate([
            {
                $match: {
                    status: withdrawal_status_enum_1.WithdrawalStatus.COMPLETED,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$fee' },
                },
            },
        ])
            .session(session || null);
        return result.length > 0 && result[0].total
            ? new decimal_js_1.default(result[0].total.toString()).toNumber()
            : 0;
    }
};
exports.MongoWithdrawalRepository = MongoWithdrawalRepository;
exports.MongoWithdrawalRepository = MongoWithdrawalRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(withdrawal_request_entity_1.WithdrawalRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoWithdrawalRepository);
//# sourceMappingURL=mongo.withdrawal.repository.js.map