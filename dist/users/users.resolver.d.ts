import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FindUserInput } from './dto/find-user.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersPage } from './dto/users-page.type';
import { UsersFilterInput } from './dto/users-filter.input';
import { PublicProfile } from './dto/public-profile.dto';
export declare class UsersResolver {
    private readonly usersService;
    constructor(usersService: UsersService);
    getPublicProfile(userId: string): Promise<PublicProfile>;
    me(currentUser: JwtPayload): Promise<User>;
    findUser(input: FindUserInput): Promise<User>;
    findAll(input: PaginationInput, filter?: UsersFilterInput): Promise<UsersPage>;
    updateProfile(currentUser: JwtPayload, input: UpdateUserInput): Promise<User>;
    deleteAccount(currentUser: JwtPayload): Promise<boolean>;
    adminUpdateUser(currentUser: JwtPayload, targetUser: FindUserInput, input: UpdateUserInput): Promise<User>;
    adminDeleteUser(currentUser: JwtPayload, targetUser: FindUserInput): Promise<boolean>;
}
