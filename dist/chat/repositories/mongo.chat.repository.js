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
exports.MongoChatRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_message_entity_1 = require("../entities/chat-message.entity");
const chat_read_state_entity_1 = require("../entities/chat-read-state.entity");
let MongoChatRepository = class MongoChatRepository {
    messageModel;
    readStateModel;
    constructor(messageModel, readStateModel) {
        this.messageModel = messageModel;
        this.readStateModel = readStateModel;
    }
    async createMessage(data, session) {
        const created = new this.messageModel({
            clientMessageId: data.clientMessageId,
            auctionId: new mongoose_2.Types.ObjectId(data.auctionId),
            senderId: new mongoose_2.Types.ObjectId(data.senderId),
            senderName: data.senderName,
            content: data.content,
            type: data.type,
            mediaUrls: data.mediaUrls,
        });
        return await created.save({ session });
    }
    async findByAuctionIdWithCursor(auctionId, limit, cursor, session) {
        const baseFilter = { auctionId: new mongoose_2.Types.ObjectId(auctionId) };
        const filter = cursor
            ? {
                ...baseFilter,
                $or: [
                    { createdAt: { $lt: cursor.createdAt } },
                    {
                        createdAt: cursor.createdAt,
                        _id: { $lt: new mongoose_2.Types.ObjectId(cursor._id) },
                    },
                ],
            }
            : baseFilter;
        const items = await this.messageModel
            .find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .session(session || null)
            .exec();
        const hasNextPage = items.length > limit;
        const resultItems = hasNextPage ? items.slice(0, limit) : items;
        const endCursor = resultItems.length > 0
            ? `${resultItems[resultItems.length - 1].createdAt.toISOString()}_${resultItems[resultItems.length - 1]._id.toString()}`
            : null;
        return {
            items: resultItems,
            hasNextPage,
            endCursor,
        };
    }
    async findByClientMessageId(auctionId, senderId, clientMessageId, session) {
        return await this.messageModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            senderId: new mongoose_2.Types.ObjectId(senderId),
            clientMessageId,
        })
            .session(session || null)
            .exec();
    }
    async findById(messageId, session) {
        return await this.messageModel
            .findById(messageId)
            .session(session || null)
            .exec();
    }
    async updateMessageAtomically(messageId, senderId, data, timeLimit, session) {
        const filter = timeLimit
            ? {
                _id: new mongoose_2.Types.ObjectId(messageId),
                senderId: new mongoose_2.Types.ObjectId(senderId),
                createdAt: { $gte: timeLimit },
            }
            : {
                _id: new mongoose_2.Types.ObjectId(messageId),
            };
        return await this.messageModel
            .findOneAndUpdate(filter, { $set: data }, { returnDocument: 'after', session })
            .exec();
    }
    async addOrUpdateReaction(messageId, userId, emoji, session) {
        let result = await this.messageModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(messageId),
            'reactions.userId': new mongoose_2.Types.ObjectId(userId),
        }, { $set: { 'reactions.$.emoji': emoji } }, { returnDocument: 'after', session })
            .exec();
        if (!result) {
            result = await this.messageModel
                .findOneAndUpdate({ _id: new mongoose_2.Types.ObjectId(messageId) }, {
                $push: {
                    reactions: { emoji, userId: new mongoose_2.Types.ObjectId(userId) },
                },
            }, { returnDocument: 'after', session })
                .exec();
        }
        return result;
    }
    async removeReaction(messageId, userId, session) {
        return await this.messageModel
            .findOneAndUpdate({ _id: new mongoose_2.Types.ObjectId(messageId) }, {
            $pull: {
                reactions: { userId: new mongoose_2.Types.ObjectId(userId) },
            },
        }, { returnDocument: 'after', session })
            .exec();
    }
    async upsertReadState(auctionId, userId, lastReadMessageId, session) {
        return await this.readStateModel
            .findOneAndUpdate({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            userId: new mongoose_2.Types.ObjectId(userId),
        }, {
            $set: {
                lastReadMessageId: new mongoose_2.Types.ObjectId(lastReadMessageId),
                lastReadAt: new Date(),
            },
        }, { upsert: true, returnDocument: 'after', session })
            .exec();
    }
    async findReadState(auctionId, userId, session) {
        return await this.readStateModel
            .findOne({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
            userId: new mongoose_2.Types.ObjectId(userId),
        })
            .session(session || null)
            .exec();
    }
    async findReadStatesByAuction(auctionId, session) {
        return await this.readStateModel
            .find({
            auctionId: new mongoose_2.Types.ObjectId(auctionId),
        })
            .session(session || null)
            .exec();
    }
    async getUnreadCountForRoom(auctionId, userId, session) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const auctionObjectId = new mongoose_2.Types.ObjectId(auctionId);
        const readState = await this.readStateModel
            .findOne({ auctionId: auctionObjectId, userId: userObjectId })
            .session(session || null)
            .lean()
            .exec();
        const query = {
            auctionId: auctionObjectId,
            senderId: { $ne: userObjectId },
        };
        if (readState?.lastReadMessageId) {
            query._id = { $gt: readState.lastReadMessageId };
        }
        return await this.messageModel
            .countDocuments(query)
            .session(session || null)
            .exec();
    }
    async getTotalUnreadRoomsCount(userId, auctionIds) {
        if (auctionIds.length === 0)
            return 0;
        const unreadMap = await this.getUnreadCountsForAuctions(auctionIds, userId);
        let total = 0;
        for (const count of unreadMap.values()) {
            if (count > 0)
                total++;
        }
        return total;
    }
    async getLatestMessagesForAuctions(auctionIds) {
        const map = new Map();
        if (auctionIds.length === 0)
            return map;
        const results = await this.messageModel.aggregate([
            { $match: { auctionId: { $in: auctionIds } } },
            { $sort: { auctionId: 1, createdAt: -1, _id: -1 } },
            {
                $group: {
                    _id: '$auctionId',
                    lastMessage: { $first: '$$ROOT' },
                    lastMessageAt: { $first: '$createdAt' },
                },
            },
        ]);
        for (const item of results) {
            map.set(item._id.toString(), {
                lastMessage: item.lastMessage,
                lastMessageAt: item.lastMessageAt,
            });
        }
        return map;
    }
    async getUnreadCountsForAuctions(auctionIds, userId) {
        const unreadMap = new Map();
        if (auctionIds.length === 0)
            return unreadMap;
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const readStates = await this.readStateModel
            .find({ auctionId: { $in: auctionIds }, userId: userObjectId })
            .lean()
            .exec();
        const readStateMap = new Map(readStates.map((rs) => [rs.auctionId.toString(), rs.lastReadMessageId]));
        const counts = await Promise.all(auctionIds.map(async (auctionId) => {
            const lastReadMessageId = readStateMap.get(auctionId.toString());
            const query = {
                auctionId,
                senderId: { $ne: userObjectId },
            };
            if (lastReadMessageId) {
                query._id = { $gt: lastReadMessageId };
            }
            const count = await this.messageModel.countDocuments(query);
            return { key: auctionId.toString(), count };
        }));
        for (const c of counts) {
            unreadMap.set(c.key, c.count);
        }
        return unreadMap;
    }
};
exports.MongoChatRepository = MongoChatRepository;
exports.MongoChatRepository = MongoChatRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_message_entity_1.ChatMessage.name)),
    __param(1, (0, mongoose_1.InjectModel)(chat_read_state_entity_1.ChatReadState.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MongoChatRepository);
//# sourceMappingURL=mongo.chat.repository.js.map