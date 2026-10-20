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
exports.MongoAuthRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const refresh_token_entity_1 = require("../entities/refresh-token.entity");
let MongoAuthRepository = class MongoAuthRepository {
    refreshTokenModel;
    constructor(refreshTokenModel) {
        this.refreshTokenModel = refreshTokenModel;
    }
    async saveRefreshToken(userId, hashedToken, expiresAt) {
        await this.refreshTokenModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            hashedToken,
            expiresAt,
        });
    }
    async findRefreshToken(hashedToken) {
        return this.refreshTokenModel.findOne({ hashedToken }).exec();
    }
    async deleteRefreshToken(hashedToken) {
        await this.refreshTokenModel.deleteOne({ hashedToken }).exec();
    }
    async deleteAllUserTokens(userId) {
        await this.refreshTokenModel
            .deleteMany({ userId: new mongoose_2.Types.ObjectId(userId) })
            .exec();
    }
};
exports.MongoAuthRepository = MongoAuthRepository;
exports.MongoAuthRepository = MongoAuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(refresh_token_entity_1.RefreshToken.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoAuthRepository);
//# sourceMappingURL=mongo.auth.repository.js.map