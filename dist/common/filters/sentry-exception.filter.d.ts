import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlExceptionFilter } from '@nestjs/graphql';
export declare class SentryExceptionFilter extends BaseExceptionFilter implements GqlExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
    private scrubSensitiveData;
}
