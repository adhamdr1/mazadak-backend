"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionCategory = void 0;
const graphql_1 = require("@nestjs/graphql");
var AuctionCategory;
(function (AuctionCategory) {
    AuctionCategory["ELECTRONICS"] = "ELECTRONICS";
    AuctionCategory["FASHION"] = "FASHION";
    AuctionCategory["JEWELRY"] = "JEWELRY";
    AuctionCategory["WATCHES"] = "WATCHES";
    AuctionCategory["ANTIQUES"] = "ANTIQUES";
    AuctionCategory["ART"] = "ART";
    AuctionCategory["COLLECTIBLES"] = "COLLECTIBLES";
    AuctionCategory["BOOKS"] = "BOOKS";
    AuctionCategory["FURNITURE"] = "FURNITURE";
    AuctionCategory["HOME_APPLIANCES"] = "HOME_APPLIANCES";
    AuctionCategory["CARS"] = "CARS";
    AuctionCategory["MOTORCYCLES"] = "MOTORCYCLES";
    AuctionCategory["REAL_ESTATE"] = "REAL_ESTATE";
    AuctionCategory["SPORTS"] = "SPORTS";
    AuctionCategory["TOYS"] = "TOYS";
    AuctionCategory["OTHER"] = "OTHER";
})(AuctionCategory || (exports.AuctionCategory = AuctionCategory = {}));
(0, graphql_1.registerEnumType)(AuctionCategory, {
    name: 'AuctionCategory',
});
//# sourceMappingURL=auction-category.enum.js.map