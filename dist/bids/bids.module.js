"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const bid_entity_1 = require("./entities/bid.entity");
const auto_bid_entity_1 = require("./entities/auto-bid.entity");
const bids_resolver_1 = require("./bids.resolver");
const bids_service_1 = require("./bids.service");
const mongo_bid_repository_1 = require("./repositories/mongo.bid.repository");
const mongo_auto_bid_repository_1 = require("./repositories/mongo.auto-bid.repository");
const proxy_bidding_engine_service_1 = require("./services/proxy-bidding-engine.service");
const auto_bidding_service_1 = require("./services/auto-bidding.service");
const wallet_module_1 = require("../wallet/wallet.module");
const auctions_module_1 = require("../auctions/auctions.module");
const escrow_module_1 = require("../escrow/escrow.module");
let BidsModule = class BidsModule {
};
exports.BidsModule = BidsModule;
exports.BidsModule = BidsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: bid_entity_1.Bid.name, schema: bid_entity_1.BidSchema },
                { name: auto_bid_entity_1.AutoBid.name, schema: auto_bid_entity_1.AutoBidSchema },
            ]),
            wallet_module_1.WalletModule,
            auctions_module_1.AuctionsModule,
            escrow_module_1.EscrowModule,
        ],
        providers: [
            bids_resolver_1.BidsResolver,
            bids_resolver_1.AutoBidsResolver,
            bids_service_1.BidsService,
            proxy_bidding_engine_service_1.ProxyBiddingEngineService,
            auto_bidding_service_1.AutoBiddingService,
            {
                provide: 'IBidRepository',
                useClass: mongo_bid_repository_1.MongoBidRepository,
            },
            {
                provide: 'IAutoBidRepository',
                useClass: mongo_auto_bid_repository_1.MongoAutoBidRepository,
            },
        ],
        exports: [bids_service_1.BidsService, auto_bidding_service_1.AutoBiddingService, proxy_bidding_engine_service_1.ProxyBiddingEngineService],
    })
], BidsModule);
//# sourceMappingURL=bids.module.js.map