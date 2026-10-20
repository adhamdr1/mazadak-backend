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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowsPage = void 0;
const graphql_1 = require("@nestjs/graphql");
const escrow_entity_1 = require("../entities/escrow.entity");
let EscrowsPage = class EscrowsPage {
    items;
    total;
    totalPages;
    hasNextPage;
};
exports.EscrowsPage = EscrowsPage;
__decorate([
    (0, graphql_1.Field)(() => [escrow_entity_1.Escrow]),
    __metadata("design:type", Array)
], EscrowsPage.prototype, "items", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], EscrowsPage.prototype, "total", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], EscrowsPage.prototype, "totalPages", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    __metadata("design:type", Boolean)
], EscrowsPage.prototype, "hasNextPage", void 0);
exports.EscrowsPage = EscrowsPage = __decorate([
    (0, graphql_1.ObjectType)()
], EscrowsPage);
//# sourceMappingURL=escrows-page.type.js.map