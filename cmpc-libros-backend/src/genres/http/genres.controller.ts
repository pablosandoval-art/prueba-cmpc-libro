import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE } from '../../auth/http/auth-cookie.js';
import { GenresService } from '../application/genres.service.js';

export class GenreResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ficción' })
  name: string;
}

@ApiTags('genres')
@ApiBearerAuth()
@ApiCookieAuth(AUTH_COOKIE)
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Get()
  @ApiOperation({ summary: 'Lista el catálogo de géneros (para el selector)' })
  @ApiOkResponse({ type: GenreResponseDto, isArray: true })
  findAll(): Promise<GenreResponseDto[]> {
    return this.genres.findAll();
  }
}
