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
exports.UploadSignatureResponse = void 0;
const graphql_1 = require("@nestjs/graphql");
let UploadSignatureResponse = class UploadSignatureResponse {
    signature;
    timestamp;
    apiKey;
    cloudName;
    folder;
};
exports.UploadSignatureResponse = UploadSignatureResponse;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], UploadSignatureResponse.prototype, "signature", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], UploadSignatureResponse.prototype, "timestamp", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], UploadSignatureResponse.prototype, "apiKey", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], UploadSignatureResponse.prototype, "cloudName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], UploadSignatureResponse.prototype, "folder", void 0);
exports.UploadSignatureResponse = UploadSignatureResponse = __decorate([
    (0, graphql_1.ObjectType)()
], UploadSignatureResponse);
//# sourceMappingURL=upload-signature.response.js.map