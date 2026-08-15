import { registerEnumType } from '@nestjs/graphql';

export enum ReviewsSortField {
  CREATED_AT = 'createdAt',
  RATING = 'overallRating',
}

registerEnumType(ReviewsSortField, {
  name: 'ReviewsSortField',
  description: 'Available sorting fields for reviews listing',
});
