import { AddressInput } from '../../users/dto/address.input';
export declare class RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    dateOfBirth: Date;
    address: AddressInput;
}
