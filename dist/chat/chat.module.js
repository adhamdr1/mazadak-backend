"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chat_resolver_1 = require("./chat.resolver");
const chat_service_1 = require("./chat.service");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chat_read_state_entity_1 = require("./entities/chat-read-state.entity");
const mongo_chat_repository_1 = require("./repositories/mongo.chat.repository");
const auctions_module_1 = require("../auctions/auctions.module");
const rabbitmq_module_1 = require("../infrastructure/rabbitmq/rabbitmq.module");
const pubsub_module_1 = require("../infrastructure/pubsub/pubsub.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: chat_message_entity_1.ChatMessage.name, schema: chat_message_entity_1.ChatMessageSchema },
                { name: chat_read_state_entity_1.ChatReadState.name, schema: chat_read_state_entity_1.ChatReadStateSchema },
            ]),
            auctions_module_1.AuctionsModule,
            rabbitmq_module_1.RabbitMQModule,
            pubsub_module_1.PubSubModule,
        ],
        providers: [
            chat_resolver_1.ChatResolver,
            chat_service_1.ChatService,
            {
                provide: 'IChatRepository',
                useClass: mongo_chat_repository_1.MongoChatRepository,
            },
        ],
        exports: [chat_service_1.ChatService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map