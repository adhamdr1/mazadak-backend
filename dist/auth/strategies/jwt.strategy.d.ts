import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import Redis from 'ioredis';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    private readonly redis;
    constructor(configService: ConfigService, usersService: UsersService, redis: Redis);
    validate(payload: JwtPayload): Promise<JwtPayload>;
    private triggerBackgroundRefresh;
    private dbCheckAndCache;
}
export {};
