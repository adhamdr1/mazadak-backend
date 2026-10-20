"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyBiddingEngineService = void 0;
const common_1 = require("@nestjs/common");
const decimal_js_1 = __importDefault(require("decimal.js"));
const bid_status_enum_1 = require("../enums/bid-status.enum");
const no_active_auto_bids_exception_1 = require("../exceptions/no-active-auto-bids.exception");
let ProxyBiddingEngineService = class ProxyBiddingEngineService {
    calculateNextState(auction, activeAutoBids, manualBid) {
        const increment = new decimal_js_1.default(auction.minimumBidIncrement);
        const exhaustedAutoBidIds = [];
        const bidsToCreate = [];
        const sortedAutoBids = [...activeAutoBids].sort((a, b) => {
            const diff = new decimal_js_1.default(b.maxAmount).minus(a.maxAmount).toNumber();
            if (diff !== 0)
                return diff;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        if (manualBid) {
            const manualAmount = new decimal_js_1.default(manualBid.amount);
            const competingAutoBids = sortedAutoBids.filter((ab) => ab.userId !== manualBid.bidderId);
            if (competingAutoBids.length === 0) {
                const winningAmount = manualAmount.toNumber();
                bidsToCreate.push({
                    bidderId: manualBid.bidderId,
                    amount: winningAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: false,
                });
                return {
                    winningBidderId: manualBid.bidderId,
                    winningAmount,
                    isAutoBid: false,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
            const topAutoBid = competingAutoBids[0];
            const topAutoBidMax = new decimal_js_1.default(topAutoBid.maxAmount);
            for (const ab of competingAutoBids) {
                if (new decimal_js_1.default(ab.maxAmount).lte(manualAmount)) {
                    exhaustedAutoBidIds.push(ab.id);
                }
            }
            if (topAutoBidMax.gte(manualAmount.plus(increment))) {
                bidsToCreate.push({
                    bidderId: manualBid.bidderId,
                    amount: manualAmount.toNumber(),
                    status: bid_status_enum_1.BidStatus.OUTBID,
                    isAutoBid: false,
                });
                const autoBidAmount = manualAmount.plus(increment).toNumber();
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: autoBidAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount: autoBidAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
            else if (topAutoBidMax.gt(manualAmount)) {
                bidsToCreate.push({
                    bidderId: manualBid.bidderId,
                    amount: manualAmount.toNumber(),
                    status: bid_status_enum_1.BidStatus.OUTBID,
                    isAutoBid: false,
                });
                const autoBidAmount = topAutoBidMax.toNumber();
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: autoBidAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                exhaustedAutoBidIds.push(topAutoBid.id);
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount: autoBidAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
            else if (topAutoBidMax.eq(manualAmount)) {
                bidsToCreate.push({
                    bidderId: manualBid.bidderId,
                    amount: manualAmount.toNumber(),
                    status: bid_status_enum_1.BidStatus.OUTBID,
                    isAutoBid: false,
                });
                const autoBidAmount = topAutoBidMax.toNumber();
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: autoBidAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                exhaustedAutoBidIds.push(topAutoBid.id);
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount: autoBidAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
            else {
                const winningAmount = manualAmount.toNumber();
                bidsToCreate.push({
                    bidderId: manualBid.bidderId,
                    amount: winningAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: false,
                });
                return {
                    winningBidderId: manualBid.bidderId,
                    winningAmount,
                    isAutoBid: false,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
        }
        if (sortedAutoBids.length === 0) {
            throw new no_active_auto_bids_exception_1.NoActiveAutoBidsException();
        }
        const topAutoBid = sortedAutoBids[0];
        const topAutoBidMax = new decimal_js_1.default(topAutoBid.maxAmount);
        const secondAutoBid = sortedAutoBids.length > 1 ? sortedAutoBids[1] : null;
        if (!auction.hasExistingBids) {
            if (!secondAutoBid) {
                const winningAmount = new decimal_js_1.default(auction.startPrice).toNumber();
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: winningAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
            else {
                const secondMax = new decimal_js_1.default(secondAutoBid.maxAmount);
                exhaustedAutoBidIds.push(secondAutoBid.id);
                for (let i = 2; i < sortedAutoBids.length; i++) {
                    exhaustedAutoBidIds.push(sortedAutoBids[i].id);
                }
                const targetPrice = decimal_js_1.default.min(topAutoBidMax, secondMax.plus(increment));
                const winningAmount = targetPrice.toNumber();
                bidsToCreate.push({
                    bidderId: secondAutoBid.userId,
                    amount: secondMax.toNumber(),
                    status: bid_status_enum_1.BidStatus.OUTBID,
                    isAutoBid: true,
                });
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: winningAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                if (topAutoBidMax.eq(targetPrice)) {
                    exhaustedAutoBidIds.push(topAutoBid.id);
                }
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
        }
        else {
            const currentPrice = new decimal_js_1.default(auction.currentPrice);
            if (auction.currentWinnerId === topAutoBid.userId) {
                if (!secondAutoBid) {
                    return {
                        winningBidderId: topAutoBid.userId,
                        winningAmount: currentPrice.toNumber(),
                        isAutoBid: true,
                        winningAutoBidId: topAutoBid.id,
                        exhaustedAutoBidIds,
                        bidsToCreate: [],
                    };
                }
                else {
                    const secondMax = new decimal_js_1.default(secondAutoBid.maxAmount);
                    if (secondMax.gte(currentPrice)) {
                        exhaustedAutoBidIds.push(secondAutoBid.id);
                        for (let i = 2; i < sortedAutoBids.length; i++) {
                            exhaustedAutoBidIds.push(sortedAutoBids[i].id);
                        }
                        const targetPrice = decimal_js_1.default.min(topAutoBidMax, secondMax.plus(increment));
                        const winningAmount = targetPrice.toNumber();
                        bidsToCreate.push({
                            bidderId: topAutoBid.userId,
                            amount: winningAmount,
                            status: bid_status_enum_1.BidStatus.WINNING,
                            isAutoBid: true,
                        });
                        if (topAutoBidMax.eq(targetPrice)) {
                            exhaustedAutoBidIds.push(topAutoBid.id);
                        }
                        return {
                            winningBidderId: topAutoBid.userId,
                            winningAmount,
                            isAutoBid: true,
                            winningAutoBidId: topAutoBid.id,
                            exhaustedAutoBidIds,
                            bidsToCreate,
                        };
                    }
                    else {
                        return {
                            winningBidderId: topAutoBid.userId,
                            winningAmount: currentPrice.toNumber(),
                            isAutoBid: true,
                            winningAutoBidId: topAutoBid.id,
                            exhaustedAutoBidIds,
                            bidsToCreate: [],
                        };
                    }
                }
            }
            else {
                const requiredToBeat = currentPrice.plus(increment);
                const secondMax = secondAutoBid
                    ? new decimal_js_1.default(secondAutoBid.maxAmount)
                    : currentPrice;
                const baseForCalculation = decimal_js_1.default.max(requiredToBeat, secondMax);
                if (secondAutoBid) {
                    exhaustedAutoBidIds.push(secondAutoBid.id);
                }
                for (let i = 2; i < sortedAutoBids.length; i++) {
                    exhaustedAutoBidIds.push(sortedAutoBids[i].id);
                }
                const targetPrice = decimal_js_1.default.min(topAutoBidMax, baseForCalculation.plus(secondAutoBid && secondMax.gt(currentPrice) ? increment : 0));
                const finalWinningPrice = decimal_js_1.default.max(requiredToBeat, targetPrice);
                const winningAmount = finalWinningPrice.toNumber();
                bidsToCreate.push({
                    bidderId: topAutoBid.userId,
                    amount: winningAmount,
                    status: bid_status_enum_1.BidStatus.WINNING,
                    isAutoBid: true,
                });
                if (topAutoBidMax.lte(finalWinningPrice)) {
                    exhaustedAutoBidIds.push(topAutoBid.id);
                }
                return {
                    winningBidderId: topAutoBid.userId,
                    winningAmount,
                    isAutoBid: true,
                    winningAutoBidId: topAutoBid.id,
                    exhaustedAutoBidIds,
                    bidsToCreate,
                };
            }
        }
    }
};
exports.ProxyBiddingEngineService = ProxyBiddingEngineService;
exports.ProxyBiddingEngineService = ProxyBiddingEngineService = __decorate([
    (0, common_1.Injectable)()
], ProxyBiddingEngineService);
//# sourceMappingURL=proxy-bidding-engine.service.js.map