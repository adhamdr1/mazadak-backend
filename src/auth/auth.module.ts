import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { MongoAuthRepository } from './repositories/mongo.auth.repository';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Gives AuthService access to UsersService (exported from UsersModule).
    UsersModule,

    // Adds JWT authentication functionality.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Register the RefreshToken collection in this module's scope.
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),

    // Configure JWT with async factory so we can inject ConfigService.
    // `global: true` is intentionally omitted — we scope JWT to Auth only.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    JwtStrategy,
    {
      provide: 'IAuthRepository',
      useClass: MongoAuthRepository,
    },
  ],
})
export class AuthModule {}
