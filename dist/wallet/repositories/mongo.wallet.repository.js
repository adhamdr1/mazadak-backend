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
exports.MongoWalletRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const wallet_entity_1 = require("../entities/wallet.entity");
const decimal_js_1 = __importDefault(require("decimal.js"));
let MongoWalletRepository = class MongoWalletRepository {
    walletModel;
    constructor(walletModel) {
        this.walletModel = walletModel;
    }
    async create(userId, session) {
        const wallet = new this.walletModel({ userId: new mongoose_2.Types.ObjectId(userId) });
        return await wallet.save({ session });
    }
    async findByUserId(userId, session) {
        return await this.walletModel
            .findOne({ userId: new mongoose_2.Types.ObjectId(userId) })
            .session(session || null)
            .exec();
    }
    async findByUserIds(userIds) {
        const validObjectIds = userIds
            .filter((id) => mongoose_2.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_2.Types.ObjectId(id));
        if (validObjectIds.length === 0)
            return [];
        return await this.walletModel
            .find({ userId: { $in: validObjectIds } })
            .exec();
    }
    async findById(walletId) {
        return await this.walletModel.findById(new mongoose_2.Types.ObjectId(walletId)).exec();
    }
    async findAll(page, limit) {
        const skip = (page - 1) * limit;
        return await this.walletModel
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }
    async countAll() {
        return await this.walletModel.countDocuments().exec();
    }
    async sumAllBalances() {
        const result = await this.walletModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$balance' },
                },
            },
        ]);
        return result.length > 0 && result[0].totalBalance
            ? new decimal_js_1.default(result[0].totalBalance.toString()).toNumber()
            : 0;
    }
    async sumHeldBalances() {
        const result = await this.walletModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalHeld: { $sum: '$heldBalance' },
                },
            },
        ]);
        return result.length > 0 && result[0].totalHeld
            ? new decimal_js_1.default(result[0].totalHeld.toString()).toNumber()
            : 0;
    }
    async creditBalance(walletId, amount, session) {
        const decimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).toString());
        return await this.walletModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(walletId), { $inc: { balance: decimalAmount } }, { returnDocument: 'after', session })
            .exec();
    }
    async debitBalance(walletId, amount, session) {
        const decimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).toString());
        const negativeDecimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).negated().toString());
        return await this.walletModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(walletId),
            $expr: {
                $gte: [{ $subtract: ['$balance', '$heldBalance'] }, decimalAmount],
            },
        }, { $inc: { balance: negativeDecimalAmount } }, { returnDocument: 'after', session })
            .exec();
    }
    async holdBalance(walletId, amount, session) {
        const decimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).toString());
        return await this.walletModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(walletId),
            $expr: {
                $gte: [{ $subtract: ['$balance', '$heldBalance'] }, decimalAmount],
            },
        }, { $inc: { heldBalance: decimalAmount } }, { returnDocument: 'after', session })
            .exec();
    }
    async releaseBalance(walletId, amount, session) {
        const decimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).toString());
        const negativeDecimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).negated().toString());
        return await this.walletModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(walletId),
            $expr: { $gte: ['$heldBalance', decimalAmount] },
        }, { $inc: { heldBalance: negativeDecimalAmount } }, { returnDocument: 'after', session })
            .exec();
    }
    async captureHeldBalance(walletId, amount, session) {
        const decimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).toString());
        const negativeDecimalAmount = mongoose_2.Types.Decimal128.fromString(new decimal_js_1.default(amount).negated().toString());
        return await this.walletModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(walletId),
            $expr: { $gte: ['$heldBalance', decimalAmount] },
        }, {
            $inc: {
                balance: negativeDecimalAmount,
                heldBalance: negativeDecimalAmount,
            },
        }, { returnDocument: 'after', session })
            .exec();
    }
};
exports.MongoWalletRepository = MongoWalletRepository;
exports.MongoWalletRepository = MongoWalletRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(wallet_entity_1.Wallet.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoWalletRepository);
//# sourceMappingURL=mongo.wallet.repository.js.map