import { registerEnumType } from '@nestjs/graphql';

export enum ReviewStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
}

registerEnumType(ReviewStatus, {
  name: 'ReviewStatus',
  description: 'Publication and moderation status of a review',
});
