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
exports.GetUserPublicProfileHandler = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const get_user_public_profile_query_1 = require("../get-user-public-profile.query");
const users_service_1 = require("../../users.service");
let GetUserPublicProfileHandler = class GetUserPublicProfileHandler {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async execute(query) {
        return this.usersService.getPublicProfile(query.userId);
    }
};
exports.GetUserPublicProfileHandler = GetUserPublicProfileHandler;
exports.GetUserPublicProfileHandler = GetUserPublicProfileHandler = __decorate([
    (0, cqrs_1.QueryHandler)(get_user_public_profile_query_1.GetUserPublicProfileQuery),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], GetUserPublicProfileHandler);
//# sourceMappingURL=get-user-public-profile.handler.js.map