import { UsersSortInput } from './users-sort.input';
import { UserRole } from '../enums/user-role.enum';
export declare class UsersFilterInput {
    search?: string;
    sort?: UsersSortInput;
    isBanned?: boolean;
    role?: UserRole;
    isEmailVerified?: boolean;
    startDate?: Date;
    endDate?: Date;
}
