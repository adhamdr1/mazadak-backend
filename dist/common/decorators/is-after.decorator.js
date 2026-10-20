"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsAfterConstraint = void 0;
exports.IsAfter = IsAfter;
const class_validator_1 = require("class-validator");
let IsAfterConstraint = class IsAfterConstraint {
    validate(propertyValue, args) {
        const constraints = args.constraints;
        const relatedPropertyName = constraints[0];
        const obj = args.object;
        const relatedValue = obj[relatedPropertyName];
        if (!propertyValue || !relatedValue) {
            return true;
        }
        if (propertyValue instanceof Date && relatedValue instanceof Date) {
            return propertyValue >= relatedValue;
        }
        return false;
    }
    defaultMessage(args) {
        const constraints = args.constraints;
        const relatedPropertyName = constraints[0];
        return `$property must be after or equal to ${relatedPropertyName}`;
    }
};
exports.IsAfterConstraint = IsAfterConstraint;
exports.IsAfterConstraint = IsAfterConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'IsAfter', async: false })
], IsAfterConstraint);
function IsAfter(property, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: IsAfterConstraint,
        });
    };
}
//# sourceMappingURL=is-after.decorator.js.map