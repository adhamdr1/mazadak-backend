import { registerEnumType } from '@nestjs/graphql';

export enum UsersSortField {
  CREATED_AT = 'createdAt',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
}

registerEnumType(UsersSortField, {
  name: 'UsersSortField',
  description: 'Fields by which users can be sorted',
});
