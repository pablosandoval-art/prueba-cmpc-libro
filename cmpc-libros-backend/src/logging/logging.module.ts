import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { buildLoggerParams } from './logging.options.js';

/** Logs estructurados (pino) con id por petición. Ver `logging.options.ts`. */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildLoggerParams({
          level: config.get('LOG_LEVEL', { infer: true }),
          pretty: config.get('NODE_ENV', { infer: true }) !== 'production',
        }),
    }),
  ],
})
export class LoggingModule {}
