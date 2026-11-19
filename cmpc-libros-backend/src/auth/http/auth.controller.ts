import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../../common/auth/authenticated-user.js';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../../common/auth/authenticated-user.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { AuthService } from '../application/auth.service.js';
import { TooManyLoginAttemptsException } from '../domain/login-throttle.js';
import { AUTH_COOKIE, authCookieOptions } from './auth-cookie.js';
import { LoginDto, SessionDto } from './auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secureCookie = config.get('COOKIE_SECURE', { infer: true });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesión: fija la cookie HttpOnly con el JWT (HS256)',
    description:
      'Tras LOGIN_MAX_ATTEMPTS intentos fallidos (5 por defecto) con el mismo email desde la misma IP, responde 429 durante LOGIN_LOCK_SECONDS (30 s por defecto), con la cabecera Retry-After.',
  })
  @ApiOkResponse({ type: SessionDto })
  @ApiBadRequestResponse({ description: 'Formato de datos inválido.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.' })
  @ApiForbiddenResponse({ description: 'Origen no permitido.' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos fallidos.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDto> {
    try {
      const { accessToken, expiresAt, user } = await this.auth.login(
        dto.email,
        dto.password,
        req.ip,
      );
      res.cookie(
        AUTH_COOKIE,
        accessToken,
        authCookieOptions(this.secureCookie),
      );
      return { expiresAt, user };
    } catch (error) {
      if (error instanceof TooManyLoginAttemptsException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cierra la sesión: borra la cookie' })
  @ApiNoContentResponse({ description: 'Cookie eliminada.' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, authCookieOptions(this.secureCookie));
  }

  @Get('me')
  @ApiCookieAuth(AUTH_COOKIE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Devuelve la sesión actual (usuario y expiración del token)',
  })
  @ApiOkResponse({ type: SessionDto })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  me(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): SessionDto {
    return { user, expiresAt: req.tokenExpiresAt?.toISOString() ?? '' };
  }
}
