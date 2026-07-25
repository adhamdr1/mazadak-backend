import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsAfter', async: false })
export class IsAfterConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: unknown, args: ValidationArguments) {
    const constraints = args.constraints as string[];
    const relatedPropertyName = constraints[0];
    const obj = args.object as Record<string, unknown>;
    const relatedValue = obj[relatedPropertyName];

    if (!propertyValue || !relatedValue) {
      return true; // Ignore if one of them is missing (optional fields)
    }

    if (propertyValue instanceof Date && relatedValue instanceof Date) {
      return propertyValue >= relatedValue;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const constraints = args.constraints as string[];
    const relatedPropertyName = constraints[0];
    return `$property must be after or equal to ${relatedPropertyName}`;
  }
}

export function IsAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterConstraint,
    });
  };
}
