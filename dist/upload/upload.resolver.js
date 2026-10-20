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
exports.UploadResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const upload_service_1 = require("./upload.service");
const upload_image_input_1 = require("./dto/upload-image.input");
const upload_image_response_1 = require("./dto/upload-image.response");
const upload_signature_response_1 = require("./dto/upload-signature.response");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let UploadResolver = class UploadResolver {
    uploadService;
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async uploadImage(user, input) {
        const url = await this.uploadService.uploadImage(user.sub, input.base64Data, input.folder);
        return { url };
    }
    async deleteImage(user, url) {
        await this.uploadService.deleteImage(user.sub, url);
        return true;
    }
    generateUploadSignature(user, folder) {
        return this.uploadService.generateUploadSignature(user.sub, folder);
    }
};
exports.UploadResolver = UploadResolver;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Mutation)(() => upload_image_response_1.UploadImageResponse, { name: 'uploadImage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_image_input_1.UploadImageInput]),
    __metadata("design:returntype", Promise)
], UploadResolver.prototype, "uploadImage", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'deleteImage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadResolver.prototype, "deleteImage", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Query)(() => upload_signature_response_1.UploadSignatureResponse, { name: 'generateUploadSignature' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('folder', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadResolver.prototype, "generateUploadSignature", null);
exports.UploadResolver = UploadResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadResolver);
//# sourceMappingURL=upload.resolver.js.map