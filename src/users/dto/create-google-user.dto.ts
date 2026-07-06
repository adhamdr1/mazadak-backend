import { AddressInput } from './address.input';

export class CreateGoogleUserDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  googleId!: string;
  phoneNumber!: string;
  dateOfBirth!: Date;
  address!: AddressInput;
}
