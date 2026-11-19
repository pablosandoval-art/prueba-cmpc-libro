import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE } from '../../auth/http/auth-cookie.js';
import { CurrentUser } from '../../common/auth/authenticated-user.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import {
  CatalogItemResponseDto,
  CatalogSearchQueryDto,
  CreateCatalogItemDto,
} from '../../common/catalog/catalog.dto.js';
import { AuthorsService } from '../application/authors.service.js';

/** Lo único que el controlador necesita de la respuesta HTTP. */
interface StatusSetter {
  status(code: number): unknown;
}

@ApiTags('authors')
@ApiBearerAuth()
@ApiCookieAuth(AUTH_COOKIE)
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Busca autores por nombre (para el combobox del formulario)',
  })
  @ApiOkResponse({ type: CatalogItemResponseDto, isArray: true })
  search(
    @Query() query: CatalogSearchQueryDto,
  ): Promise<CatalogItemResponseDto[]> {
    return this.authors.search({
      search: query.search || undefined,
      limit: query.limit,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Crea una autor (o devuelve la existente con ese nombre)',
    description:
      'Busca sin distinguir mayúsculas. Responde 201 si la creó (queda auditada) y 200 si ya existía.',
  })
  @ApiCreatedResponse({ type: CatalogItemResponseDto, description: 'Creada.' })
  @ApiOkResponse({ type: CatalogItemResponseDto, description: 'Ya existía.' })
  @ApiBadRequestResponse({ description: 'Nombre vacío o demasiado largo.' })
  async create(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: StatusSetter,
  ): Promise<CatalogItemResponseDto> {
    const { item, created } = await this.authors.findOrCreate(
      dto.name,
      user.id,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return item;
  }
}
