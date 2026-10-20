import { ClientSession, Model } from 'mongoose';
import { IUserRepository, CreateUserData, UpdateUserData, UsersFilter } from '../interfaces/user.repository.interface';
import { User, UserDocument } from '../entities/user.entity';
export declare class MongoUserRepository implements IUserRepository {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateUserData, session?: ClientSession): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    findByUserIdWithPassword(userId: string): Promise<User | null>;
    findByPhoneNumber(phoneNumber: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByIdIncludingDeleted(id: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    update(id: string, data: UpdateUserData, session?: ClientSession): Promise<User | null>;
    findAll(page: number, limit: number, filter?: UsersFilter): Promise<{
        items: User[];
        total: number;
    }>;
    countVerified(): Promise<number>;
    countAll(filter?: UsersFilter): Promise<number>;
    private applySearchFilter;
    softDelete(id: string, session?: ClientSession): Promise<void>;
    linkGoogleAccount(userId: string, googleId: string): Promise<User | null>;
    reactivate(id: string, session?: ClientSession): Promise<User | null>;
}
