import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { LoginThrottle } from './domain/login-throttle.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthController } from './http/auth.controller.js';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher.js';
import { InMemoryLoginThrottle } from './infrastructure/in-memory-login-throttle.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_EXPIRES_IN', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    {
      provide: LoginThrottle,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new InMemoryLoginThrottle({
          maxAttempts: config.get('LOGIN_MAX_ATTEMPTS', { infer: true }),
          lockSeconds: config.get('LOGIN_LOCK_SECONDS', { infer: true }),
        }),
    },
    // Guard global: todo endpoint exige JWT salvo los marcados con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [PasswordHasher],
})
export class AuthModule {}
