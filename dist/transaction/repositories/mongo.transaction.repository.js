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
exports.MongoTransactionRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const decimal_js_1 = __importDefault(require("decimal.js"));
const transaction_entity_1 = require("../entities/transaction.entity");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
const transaction_type_enum_1 = require("../enums/transaction-type.enum");
const transaction_status_enum_1 = require("../enums/transaction-status.enum");
let MongoTransactionRepository = class MongoTransactionRepository {
    transactionModel;
    constructor(transactionModel) {
        this.transactionModel = transactionModel;
    }
    async create(data, session) {
        const transaction = new this.transactionModel({
            walletId: new mongoose_2.Types.ObjectId(data.walletId),
            type: data.type,
            amount: mongoose_2.Types.Decimal128.fromString(data.amount.toString()),
            status: data.status,
            referenceId: data.referenceId ?? null,
            idempotencyKey: data.idempotencyKey ?? null,
            gatewayPaymentIntentId: data.gatewayPaymentIntentId ?? null,
            gatewayTransactionId: data.gatewayTransactionId ?? null,
            gatewayProvider: data.gatewayProvider ?? null,
            referenceType: data.referenceType ?? null,
            expiresAt: data.expiresAt ?? null,
            hasChild: false,
        });
        return transaction.save({ session });
    }
    async findById(id, session) {
        return this.transactionModel
            .findById(id)
            .session(session ?? null)
            .exec();
    }
    async markHasChild(id, session) {
        return this.transactionModel
            .findByIdAndUpdate(id, { $set: { hasChild: true } }, { returnDocument: 'after', session })
            .exec();
    }
    async updateGatewayPaymentIntentId(id, gatewayPaymentIntentId, session) {
        return this.transactionModel
            .findByIdAndUpdate(id, { $set: { gatewayPaymentIntentId } }, { returnDocument: 'after', session })
            .exec();
    }
    async markWalletCredited(id, session) {
        return this.transactionModel
            .findByIdAndUpdate(id, { $set: { walletCredited: true } }, { returnDocument: 'after', session })
            .exec();
    }
    shouldApplyDefaultTransactionFilter(filter) {
        if (!filter)
            return true;
        return !(filter.status ||
            filter.type ||
            filter.search ||
            filter.startDate ||
            filter.endDate ||
            filter.expiresAtBefore);
    }
    buildFilterQuery(baseFilter, filter) {
        const query = { ...baseFilter };
        if (!filter)
            return query;
        if (filter.type)
            query['type'] = filter.type;
        if (filter.status)
            query['status'] = filter.status;
        if (filter.walletId && !baseFilter['walletId']) {
            if (mongoose_2.Types.ObjectId.isValid(filter.walletId)) {
                query['walletId'] = new mongoose_2.Types.ObjectId(filter.walletId);
            }
        }
        else if (filter.walletIds &&
            filter.walletIds.length > 0 &&
            !baseFilter['walletId'] &&
            !filter.search) {
            const validIds = filter.walletIds
                .filter((id) => mongoose_2.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_2.Types.ObjectId(id));
            if (validIds.length > 0) {
                query['walletId'] = { $in: validIds };
            }
        }
        if (filter.search) {
            const trimmed = filter.search.trim();
            if (trimmed.length > 0) {
                const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = { $regex: escaped, $options: 'i' };
                const searchConditions = [
                    { referenceId: regex },
                    { gatewayPaymentIntentId: regex },
                    { gatewayTransactionId: regex },
                ];
                if (!baseFilter['walletId'] &&
                    !filter.walletId &&
                    filter.walletIds &&
                    filter.walletIds.length > 0) {
                    const validIds = filter.walletIds
                        .filter((id) => mongoose_2.Types.ObjectId.isValid(id))
                        .map((id) => new mongoose_2.Types.ObjectId(id));
                    if (validIds.length > 0) {
                        searchConditions.push({ walletId: { $in: validIds } });
                    }
                }
                query['$or'] = searchConditions;
            }
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
        if (filter.expiresAtBefore) {
            query['expiresAt'] = { $lte: filter.expiresAtBefore, $ne: null };
        }
        if (filter.hasChild !== undefined) {
            query['hasChild'] = filter.hasChild;
        }
        return query;
    }
    async findByWalletId(walletId, page, limit, filter) {
        const baseQuery = this.buildFilterQuery({ walletId: new mongoose_2.Types.ObjectId(walletId) }, filter);
        if (this.shouldApplyDefaultTransactionFilter(filter)) {
            baseQuery['$or'] = [
                { referenceId: { $ne: null } },
                { referenceId: null, hasChild: false },
            ];
        }
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] =
                filter.sort.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        return this.transactionModel
            .find(baseQuery)
            .sort(sortParams)
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
    }
    async countByWalletId(walletId, filter) {
        const baseQuery = this.buildFilterQuery({ walletId: new mongoose_2.Types.ObjectId(walletId) }, filter);
        if (this.shouldApplyDefaultTransactionFilter(filter)) {
            baseQuery['$or'] = [
                { referenceId: { $ne: null } },
                { referenceId: null, hasChild: false },
            ];
        }
        return this.transactionModel.countDocuments(baseQuery).exec();
    }
    async findAll(page, limit, filter) {
        const query = this.buildFilterQuery({}, filter);
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] =
                filter.sort.order === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        return this.transactionModel
            .find(query)
            .sort(sortParams)
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
    }
    async countAll(filter) {
        const query = this.buildFilterQuery({}, filter);
        return await this.transactionModel.countDocuments(query).exec();
    }
    async sumTodayRevenue() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const result = await this.transactionModel.aggregate([
            {
                $match: {
                    type: transaction_type_enum_1.TransactionType.DEPOSIT,
                    status: transaction_status_enum_1.TransactionStatus.SUCCESS,
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                },
            },
        ]);
        return result.length > 0 && result[0].totalRevenue
            ? new decimal_js_1.default(result[0].totalRevenue.toString()).toNumber()
            : 0;
    }
};
exports.MongoTransactionRepository = MongoTransactionRepository;
exports.MongoTransactionRepository = MongoTransactionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(transaction_entity_1.Transaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoTransactionRepository);
//# sourceMappingURL=mongo.transaction.repository.js.map