import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { User, UserSchema } from './entities/user.entity';
import { MongoUserRepository } from './repositories/mongo.user.repository';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../auth/entities/refresh-token.entity';
import { MongoAuthRepository } from '../auth/repositories/mongo.auth.repository';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    WalletModule,
  ],
  providers: [
    UsersResolver,
    UsersService,
    {
      provide: 'IUserRepository',
      useClass: MongoUserRepository,
    },
    {
      provide: 'IAuthRepository',
      useClass: MongoAuthRepository,
    },
  ],
  exports: [UsersService], // عملنا Export للـ Service عشان الـ AuthModule يقدر يستخدمها بعدين
})
export class UsersModule {}
