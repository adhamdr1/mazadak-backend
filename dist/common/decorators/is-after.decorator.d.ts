import { ValidationOptions, ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
export declare class IsAfterConstraint implements ValidatorConstraintInterface {
    validate(propertyValue: unknown, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsAfter(property: string, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
