"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionsModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const mongoose_1 = require("@nestjs/mongoose");
const auctions_service_1 = require("./auctions.service");
const auctions_resolver_1 = require("./auctions.resolver");
const auction_entity_1 = require("./entities/auction.entity");
const mongo_auction_repository_1 = require("./repositories/mongo.auction.repository");
const upload_module_1 = require("../upload/upload.module");
const wallet_module_1 = require("../wallet/wallet.module");
const bid_entity_1 = require("../bids/entities/bid.entity");
const auction_consumer_1 = require("./consumers/auction.consumer");
const get_user_auctions_count_handler_1 = require("./queries/handlers/get-user-auctions-count.handler");
const get_auction_by_id_handler_1 = require("./queries/handlers/get-auction-by-id.handler");
let AuctionsModule = class AuctionsModule {
};
exports.AuctionsModule = AuctionsModule;
exports.AuctionsModule = AuctionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cqrs_1.CqrsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: auction_entity_1.Auction.name, schema: auction_entity_1.AuctionSchema },
                { name: bid_entity_1.Bid.name, schema: bid_entity_1.BidSchema },
            ]),
            upload_module_1.UploadModule,
            wallet_module_1.WalletModule,
        ],
        providers: [
            auctions_resolver_1.AuctionsResolver,
            auctions_service_1.AuctionsService,
            auction_consumer_1.AuctionConsumer,
            get_user_auctions_count_handler_1.GetUserAuctionsCountHandler,
            get_auction_by_id_handler_1.GetAuctionByIdHandler,
            {
                provide: 'IAuctionRepository',
                useClass: mongo_auction_repository_1.MongoAuctionRepository,
            },
        ],
        exports: [auctions_service_1.AuctionsService, 'IAuctionRepository'],
    })
], AuctionsModule);
//# sourceMappingURL=auctions.module.js.map