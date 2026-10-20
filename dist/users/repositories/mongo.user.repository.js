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
exports.MongoUserRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_entity_1 = require("../entities/user.entity");
const auth_provider_enum_1 = require("../enums/auth-provider.enum");
const user_role_enum_1 = require("../enums/user-role.enum");
let MongoUserRepository = class MongoUserRepository {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async startSession() {
        return await this.userModel.db.startSession();
    }
    async create(data, session) {
        const createdUser = new this.userModel(data);
        return await createdUser.save({ session });
    }
    async findByEmail(email) {
        return await this.userModel
            .findOne({
            email,
        })
            .exec();
    }
    async findByEmailWithPassword(email) {
        return await this.userModel
            .findOne({
            email,
        })
            .select('+password')
            .exec();
    }
    async findByUserIdWithPassword(userId) {
        return await this.userModel
            .findOne({
            _id: userId,
            deletedAt: null,
        })
            .select('+password')
            .exec();
    }
    async findByPhoneNumber(phoneNumber) {
        return await this.userModel
            .findOne({
            phoneNumber,
        })
            .exec();
    }
    async findById(id) {
        return await this.userModel
            .findOne({
            _id: id,
            deletedAt: null,
        })
            .exec();
    }
    async findByIdIncludingDeleted(id) {
        return await this.userModel.findById(id).exec();
    }
    async findByGoogleId(googleId) {
        return await this.userModel
            .findOne({
            googleId,
            deletedAt: null,
        })
            .exec();
    }
    async update(id, data, session) {
        return await this.userModel
            .findOneAndUpdate({
            _id: id,
            deletedAt: null,
        }, { $set: data }, { returnDocument: 'after', session })
            .exec();
    }
    async findAll(page, limit, filter) {
        const skip = (page - 1) * limit;
        const query = {
            deletedAt: null,
        };
        if (filter?.search) {
            this.applySearchFilter(query, filter.search);
        }
        if (typeof filter?.isBanned === 'boolean') {
            query.isBanned = filter.isBanned;
        }
        if (filter?.role) {
            query.role = filter.role;
        }
        if (typeof filter?.isEmailVerified === 'boolean') {
            query.isEmailVerified = filter.isEmailVerified;
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
        const sortParams = {};
        if (filter?.sort) {
            sortParams[filter.sort.field] = filter.sort.order === 'ASC' ? 1 : -1;
        }
        else {
            sortParams['createdAt'] = -1;
        }
        const [items, total] = await Promise.all([
            this.userModel
                .find(query)
                .sort(sortParams)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.userModel.countDocuments(query).exec(),
        ]);
        return { items, total };
    }
    async countVerified() {
        return await this.userModel
            .countDocuments({
            isEmailVerified: true,
            deletedAt: null,
            role: { $ne: user_role_enum_1.UserRole.ADMIN },
        })
            .exec();
    }
    async countAll(filter) {
        const query = {
            deletedAt: null,
            role: filter?.role ? filter.role : { $ne: user_role_enum_1.UserRole.ADMIN },
        };
        if (filter?.search) {
            this.applySearchFilter(query, filter.search);
        }
        if (typeof filter?.isBanned === 'boolean') {
            query.isBanned = filter.isBanned;
        }
        if (typeof filter?.isEmailVerified === 'boolean') {
            query.isEmailVerified = filter.isEmailVerified;
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
        return await this.userModel.countDocuments(query).exec();
    }
    applySearchFilter(query, search) {
        if (!search)
            return;
        const trimmed = search.trim();
        if (!trimmed)
            return;
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');
        const orConditions = [
            { firstName: { $regex: searchRegex } },
            { lastName: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { phoneNumber: { $regex: searchRegex } },
        ];
        if (mongoose_2.Types.ObjectId.isValid(trimmed)) {
            orConditions.push({ _id: new mongoose_2.Types.ObjectId(trimmed) });
        }
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
            const firstEscaped = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const restEscaped = parts
                .slice(1)
                .join(' ')
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            orConditions.push({
                $and: [
                    { firstName: { $regex: new RegExp(firstEscaped, 'i') } },
                    { lastName: { $regex: new RegExp(restEscaped, 'i') } },
                ],
            });
            orConditions.push({
                $and: [
                    { firstName: { $regex: new RegExp(restEscaped, 'i') } },
                    { lastName: { $regex: new RegExp(firstEscaped, 'i') } },
                ],
            });
        }
        query.$or = orConditions;
    }
    async softDelete(id, session) {
        await this.userModel
            .findOneAndUpdate({
            _id: id,
            deletedAt: null,
        }, {
            deletedAt: new Date(),
            isEmailVerified: false,
        }, { session })
            .exec();
    }
    async linkGoogleAccount(userId, googleId) {
        return await this.userModel
            .findOneAndUpdate({ _id: userId, deletedAt: null }, {
            $set: {
                googleId,
                authProvider: auth_provider_enum_1.AuthProvider.GOOGLE,
                isEmailVerified: true,
            },
        }, { returnDocument: 'after' })
            .exec();
    }
    async reactivate(id, session) {
        return await this.userModel
            .findOneAndUpdate({ _id: id, deletedAt: { $ne: null } }, {
            $set: {
                deletedAt: null,
                isEmailVerified: true,
            },
        }, { returnDocument: 'after', session })
            .exec();
    }
};
exports.MongoUserRepository = MongoUserRepository;
exports.MongoUserRepository = MongoUserRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_entity_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoUserRepository);
//# sourceMappingURL=mongo.user.repository.js.map