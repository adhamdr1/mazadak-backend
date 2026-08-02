import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { RequestContext } from '../../common/context/request.context';

const sensitiveKeys = [
  'password',
  'token',
  'refreshtoken',
  'otp',
  'cardnumber',
  'secret',
];

const maskObject = (obj: Record<string, unknown>): Record<string, unknown> => {
  const masked: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(masked)) {
    const value = masked[key];
    if (sensitiveKeys.includes(key.toLowerCase())) {
      masked[key] = '[MASKED]';
    } else if (value && typeof value === 'object') {
      masked[key] = maskObject(value as Record<string, unknown>);
    }
  }
  return masked;
};

// Custom winston format to mask sensitive data
const maskSensitiveData = winston.format((info) => {
  if (info.message && typeof info.message === 'object') {
    info.message = maskObject(info.message as Record<string, unknown>);
  } else if (typeof info.message === 'string') {
    // If it's a string, look for password=... or token=... and mask it
    let msg = info.message;
    for (const key of sensitiveKeys) {
      const regex = new RegExp(
        `("${key}"\\s*:\\s*"[^"]+")|(${key}\\s*=\\s*[^\\s&]+)`,
        'gi',
      );
      msg = msg.replace(regex, `${key}= [MASKED]`);
    }
    info.message = msg;
  }
  return info;
});

// Custom winston format to add request context
const addRequestContext = winston.format((info) => {
  info.requestId = RequestContext.getRequestId() || 'system';
  info.correlationId = RequestContext.getCorrelationId() || 'system';
  info.userId = RequestContext.getUserId() || 'anonymous';
  return info;
});

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get<string>('LOG_LEVEL', 'info');
        const logDir = configService.get<string>('LOG_DIR', 'logs');

        const consoleFormat = winston.format.combine(
          winston.format.timestamp(),
          addRequestContext(),
          maskSensitiveData(),
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, context, requestId, userId }) => {
              const ctxStr = typeof context === 'string' ? ` [${context}]` : '';
              const reqIdStr =
                typeof requestId === 'string' ? requestId : 'system';
              const uIdStr = typeof userId === 'string' ? userId : 'anonymous';
              const reqStr =
                reqIdStr !== 'system'
                  ? ` (req: ${reqIdStr}, user: ${uIdStr})`
                  : '';

              let msgStr = '';
              if (typeof message === 'object' && message !== null) {
                msgStr = JSON.stringify(message, null, 2);
              } else if (typeof message === 'string') {
                msgStr = message;
              } else {
                msgStr = String(message);
              }

              const tsStr =
                typeof timestamp === 'string'
                  ? timestamp
                  : new Date().toISOString();
              const lvlStr = typeof level === 'string' ? level : 'info';
              return `${tsStr} [${lvlStr}]${ctxStr}${reqStr}: ${msgStr}`;
            },
          ),
        );

        const fileFormat = winston.format.combine(
          winston.format.timestamp(),
          addRequestContext(),
          maskSensitiveData(),
          winston.format.json(),
        );

        const transports: winston.transport[] = [
          new winston.transports.Console({
            level: logLevel,
            format: consoleFormat,
          }),
        ];

        // Always enable Daily Rotate Files for local retention & backups
        transports.push(
          new DailyRotateFile({
            dirname: logDir,
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: logLevel,
            format: fileFormat,
          }),
          new DailyRotateFile({
            dirname: logDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: fileFormat,
          }),
        );

        return {
          transports,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}
