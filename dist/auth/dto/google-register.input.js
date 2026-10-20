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
exports.GoogleRegisterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const string_transformer_1 = require("../../common/transformers/string.transformer");
const address_input_1 = require("../../users/dto/address.input");
let GoogleRegisterInput = class GoogleRegisterInput {
    token;
    firstName;
    lastName;
    phoneNumber;
    dateOfBirth;
    address;
};
exports.GoogleRegisterInput = GoogleRegisterInput;
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoogleRegisterInput.prototype, "token", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_transformer_1.Transform)(string_transformer_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'First name is required' }),
    (0, class_validator_1.MinLength)(2, { message: 'First name must be at least 2 characters long' }),
    (0, class_validator_1.MaxLength)(50, { message: 'First name must not exceed 50 characters' }),
    __metadata("design:type", String)
], GoogleRegisterInput.prototype, "firstName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_transformer_1.Transform)(string_transformer_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Last name is required' }),
    (0, class_validator_1.MinLength)(2, { message: 'Last name must be at least 2 characters long' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Last name must not exceed 50 characters' }),
    __metadata("design:type", String)
], GoogleRegisterInput.prototype, "lastName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_transformer_1.Transform)(string_transformer_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^01[0125][0-9]{8}$/, { message: 'Invalid Egyptian phone number' }),
    __metadata("design:type", String)
], GoogleRegisterInput.prototype, "phoneNumber", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.GraphQLISODateTime),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)({ message: 'Invalid date format' }),
    (0, class_validator_1.MaxDate)(() => new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), {
        message: 'User must be at least 18 years old',
    }),
    __metadata("design:type", Date)
], GoogleRegisterInput.prototype, "dateOfBirth", void 0);
__decorate([
    (0, graphql_1.Field)(() => address_input_1.AddressInput),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => address_input_1.AddressInput),
    __metadata("design:type", address_input_1.AddressInput)
], GoogleRegisterInput.prototype, "address", void 0);
exports.GoogleRegisterInput = GoogleRegisterInput = __decorate([
    (0, graphql_1.InputType)()
], GoogleRegisterInput);
//# sourceMappingURL=google-register.input.js.map