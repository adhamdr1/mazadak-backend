import { registerEnumType } from '@nestjs/graphql';

export enum AuctionCategory {
  ELECTRONICS = 'ELECTRONICS',
  FASHION = 'FASHION',
  JEWELRY = 'JEWELRY',
  WATCHES = 'WATCHES',
  ANTIQUES = 'ANTIQUES',
  ART = 'ART',
  COLLECTIBLES = 'COLLECTIBLES',
  BOOKS = 'BOOKS',
  FURNITURE = 'FURNITURE',
  HOME_APPLIANCES = 'HOME_APPLIANCES',
  CARS = 'CARS',
  MOTORCYCLES = 'MOTORCYCLES',
  REAL_ESTATE = 'REAL_ESTATE',
  SPORTS = 'SPORTS',
  TOYS = 'TOYS',
  OTHER = 'OTHER',
}

registerEnumType(AuctionCategory, {
  name: 'AuctionCategory',
});
