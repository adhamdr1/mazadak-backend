import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
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
import type { Request, Response } from 'express';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionsModule } from './auctions/auctions.module';
import { UploadModule } from './upload/upload.module';
import { BidsModule } from './bids/bids.module';
import { AdminModule } from './admin/admin.module';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';
import { PubSubModule } from './infrastructure/pubsub/pubsub.module';
import type { JwtPayload } from './auth/interfaces/jwt-payload.interface';

@Module({
  imports: [
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

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      // Enable WebSocket-based subscriptions using the graphql-ws protocol
      subscriptions: {
        'graphql-ws': {
          onConnect: async (ctx) => {
            // ctx.connectionParams is sent by the client on WebSocket handshake
            const params = ctx.connectionParams as Record<string, string>;
            const authHeader = params?.authorization ?? params?.Authorization;

            if (!authHeader) {
              // No token provided — allow anonymous WS connections.
              // Protected subscriptions will deny access via their own filter.
              return;
            }

            const token = authHeader.replace(/^Bearer\s+/i, '').trim();

            // JwtService and UsersService are injected into the module context
            // and accessed via the NestJS application reference stored in ctx.extra.
            const app = (
              ctx.extra as { app?: { get: <T>(token: unknown) => T } }
            ).app;
            if (!app) return;

            try {
              const jwtService = app.get<JwtService>(JwtService);
              const payload = jwtService.verify<JwtPayload>(token);

              // User lookup: verify the user still exists and is not deleted/blocked.
              // A valid token does not guarantee the account still exists.
              const usersService = app.get<UsersService>(UsersService);
              const user = await usersService.findById(payload.sub);

              // Attach user to WS context so subscriptions can read it
              (ctx.extra as Record<string, unknown>).user = {
                sub: user._id.toString(),
                email: user.email,
                role: user.role,
              } satisfies JwtPayload;
            } catch {
              // Invalid token or user not found — proceed without user in context.
              // Protected subscriptions will deny access via their own filter.
            }
          },
        },
      },
      // context is called per-operation for both HTTP and WebSocket
      context: ({
        req,
        res,
        extra,
      }: {
        req?: Request;
        res?: Response;
        extra?: Record<string, unknown>;
      }) => {
        // HTTP request — standard GraphQL query/mutation context
        if (req) return { req, res };
        // WebSocket connection — subscriptions context
        // extra.user is populated in onConnect if a valid token was provided
        return { req: extra, user: extra?.user };
      },
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
  ],
  providers: [
    // Global Authentication Guards
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IpBlacklistMiddleware).forRoutes('*');
  }
}
