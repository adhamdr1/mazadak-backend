import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { User, UserSchema } from './entities/user.entity';
import { MongoUserRepository } from './repositories/mongo.user.repository';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { GetUserPublicProfileHandler } from './queries/handlers/get-user-public-profile.handler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CqrsModule,
    OutboxModule,
  ],
  providers: [
    UsersResolver,
    UsersService,
    GetUserPublicProfileHandler,
    {
      provide: 'IUserRepository',
      useClass: MongoUserRepository,
    },
  ],
  exports: [UsersService], // عملنا Export للـ Service عشان الـ AuthModule يقدر يستخدمها بعدين
})
export class UsersModule {}
