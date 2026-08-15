import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisModule as AppRedisModule } from './infrastructure/redis/redis.module';
import { RabbitMQModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { OutboxModule } from './infrastructure/outbox/outbox.module';
import { IpBlacklistMiddleware } from './common/middleware/ip-blacklist.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { Request, Response } from 'express';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionsModule } from './auctions/auctions.module';
import { UploadModule } from './upload/upload.module';
import { BidsModule } from './bids/bids.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payment/payment.module';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';
import { PubSubModule } from './infrastructure/pubsub/pubsub.module';
import type { JwtPayload } from './auth/interfaces/jwt-payload.interface';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: 60_000,
            limit: 100,
          },
          // 'global' throttler applies to all routes (100 requests/minute).
          // 'strict' throttler has a high global limit (99999) by design so it does not
          // block normal authenticated traffic globally. Sensitive endpoints (e.g. auth mutations)
          // explicitly override this with @Throttle({ strict: { ttl: 60_000, limit: 5 } }).
          {
            name: 'strict',
            ttl: 60_000,
            limit: 99999,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          configService.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),

    // @nestjs-modules/ioredis currently resolves to `any` under ESLint with NodeNext.
    // Safe to ignore until the package updates its typings.
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single' as const,
        url: configService.getOrThrow<string>('REDIS_URL'),
      }),
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule, UsersModule],
      inject: [JwtService, UsersService],
      useFactory: (jwtService: JwtService, usersService: UsersService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        playground: true,
        subscriptions: {
          'graphql-ws': {
            onConnect: async (ctx) => {
              const params = ctx.connectionParams as Record<string, string>;
              const authHeader = params?.authorization ?? params?.Authorization;

              if (!authHeader) {
                return;
              }

              const token = authHeader.replace(/^Bearer\s+/i, '').trim();

              try {
                const payload = jwtService.verify<JwtPayload>(token);
                const user = await usersService.findById(payload.sub);

                if (!user || user.isBanned) {
                  return;
                }

                (ctx.extra as Record<string, unknown>).user = {
                  sub: user._id.toString(),
                  email: user.email,
                  role: user.role,
                } satisfies JwtPayload;
              } catch {
                // Invalid token - proceed
              }
            },
          },
        },
        context: ({
          req,
          res,
          extra,
        }: {
          req?: Request;
          res?: Response;
          extra?: Record<string, unknown>;
        }) => {
          if (req) return { req, res };
          return { req: extra, user: extra?.user };
        },
      }),
    }),

    ScheduleModule.forRoot(),

    PubSubModule,
    AppRedisModule,
    RabbitMQModule,
    OutboxModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    WalletModule,
    TransactionModule,
    AuctionsModule,
    UploadModule,
    BidsModule,
    AdminModule,
    PaymentModule,
    ChatModule,
    ReviewsModule,
  ],
  providers: [
    // Global Authentication Guards
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    // Global Logging Interceptor (with Winston Dependency Injection)
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, IpBlacklistMiddleware)
      .forRoutes('*');
  }
}
