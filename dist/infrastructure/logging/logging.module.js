"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingModule = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston = __importStar(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("@nestjs/config");
const request_context_1 = require("../../common/context/request.context");
const sensitiveKeys = [
    'password',
    'token',
    'refreshtoken',
    'otp',
    'cardnumber',
    'secret',
];
const maskObject = (obj) => {
    const masked = { ...obj };
    for (const key of Object.keys(masked)) {
        const value = masked[key];
        if (sensitiveKeys.includes(key.toLowerCase())) {
            masked[key] = '[MASKED]';
        }
        else if (value && typeof value === 'object') {
            masked[key] = maskObject(value);
        }
    }
    return masked;
};
const maskSensitiveData = winston.format((info) => {
    if (info.message && typeof info.message === 'object') {
        info.message = maskObject(info.message);
    }
    else if (typeof info.message === 'string') {
        let msg = info.message;
        for (const key of sensitiveKeys) {
            const regex = new RegExp(`("${key}"\\s*:\\s*"[^"]+")|(${key}\\s*=\\s*[^\\s&]+)`, 'gi');
            msg = msg.replace(regex, `${key}= [MASKED]`);
        }
        info.message = msg;
    }
    return info;
});
const addRequestContext = winston.format((info) => {
    info.requestId = request_context_1.RequestContext.getRequestId() || 'system';
    info.correlationId = request_context_1.RequestContext.getCorrelationId() || 'system';
    info.userId = request_context_1.RequestContext.getUserId() || 'anonymous';
    return info;
});
let LoggingModule = class LoggingModule {
};
exports.LoggingModule = LoggingModule;
exports.LoggingModule = LoggingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nest_winston_1.WinstonModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const logLevel = configService.get('LOG_LEVEL', 'info');
                    const logDir = configService.get('LOG_DIR', 'logs');
                    const consoleFormat = winston.format.combine(winston.format.timestamp(), addRequestContext(), maskSensitiveData(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, requestId, userId }) => {
                        const ctxStr = typeof context === 'string' ? ` [${context}]` : '';
                        const reqIdStr = typeof requestId === 'string' ? requestId : 'system';
                        const uIdStr = typeof userId === 'string' ? userId : 'anonymous';
                        const reqStr = reqIdStr !== 'system'
                            ? ` (req: ${reqIdStr}, user: ${uIdStr})`
                            : '';
                        let msgStr = '';
                        if (typeof message === 'object' && message !== null) {
                            msgStr = JSON.stringify(message, null, 2);
                        }
                        else if (typeof message === 'string') {
                            msgStr = message;
                        }
                        else {
                            msgStr = String(message);
                        }
                        const tsStr = typeof timestamp === 'string'
                            ? timestamp
                            : new Date().toISOString();
                        const lvlStr = typeof level === 'string' ? level : 'info';
                        return `${tsStr} [${lvlStr}]${ctxStr}${reqStr}: ${msgStr}`;
                    }));
                    const fileFormat = winston.format.combine(winston.format.timestamp(), addRequestContext(), maskSensitiveData(), winston.format.json());
                    const transports = [
                        new winston.transports.Console({
                            level: logLevel,
                            format: consoleFormat,
                        }),
                    ];
                    transports.push(new winston_daily_rotate_file_1.default({
                        dirname: logDir,
                        filename: 'combined-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                        level: logLevel,
                        format: fileFormat,
                    }), new winston_daily_rotate_file_1.default({
                        dirname: logDir,
                        filename: 'error-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                        level: 'error',
                        format: fileFormat,
                    }));
                    return {
                        transports,
                    };
                },
            }),
        ],
        exports: [nest_winston_1.WinstonModule],
    })
], LoggingModule);
//# sourceMappingURL=logging.module.js.map