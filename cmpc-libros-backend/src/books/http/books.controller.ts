import { Readable } from 'node:stream';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE } from '../../auth/http/auth-cookie.js';
import { CurrentUser } from '../../common/auth/authenticated-user.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { buildPaginationMeta } from '../../common/pagination/pagination.js';
import type { ImageFile } from '../../storage/image-storage.js';
import { BooksService } from '../application/books.service.js';
import {
  BookFiltersQueryDto,
  BookResponseDto,
  CreateBookDto,
  ListBooksQueryDto,
  PaginatedBooksResponseDto,
  UpdateBookDto,
  UploadBookImageDto,
} from './book.dto.js';
import { parseSort, toBookFilters, toBookQuery } from './book-query.mapper.js';

export const imageFilePipe = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new FileTypeValidator({
      fileType: /^image\/(jpeg|png|webp)$/,
      errorMessage: 'La imagen debe ser JPEG, PNG o WebP',
    }),
  ],
});

export function exportFilename(now: Date = new Date()): string {
  return `CMPC-LIBROS-${now.getTime()}.csv`;
}

@ApiTags('books')
@ApiBearerAuth()
@ApiCookieAuth(AUTH_COOKIE)
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista libros con filtros, orden multi-campo y paginación',
  })
  @ApiOkResponse({ type: PaginatedBooksResponseDto })
  async findAll(
    @Query() query: ListBooksQueryDto,
  ): Promise<PaginatedBooksResponseDto> {
    const bookQuery = toBookQuery(query);
    const result = await this.books.findAll(bookQuery);
    return {
      data: result.items.map((book) => BookResponseDto.fromDomain(book)),
      meta: buildPaginationMeta(bookQuery, result.total),
    };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Exporta a CSV los libros que cumplen los filtros indicados',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Archivo CSV (UTF-8 con BOM) `CMPC-LIBROS-<timestamp>.csv`',
    schema: { type: 'string', format: 'binary' },
  })
  exportCsv(@Query() query: BookFiltersQueryDto): StreamableFile {
    const csv = this.books.exportCsv(
      toBookFilters(query),
      parseSort(query.sort),
    );
    return new StreamableFile(Readable.from(csv), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${exportFilename()}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de un libro' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse({ description: 'El libro no existe o fue eliminado.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookResponseDto> {
    return BookResponseDto.fromDomain(await this.books.findOne(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crea un libro (queda auditado)' })
  @ApiCreatedResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o género inexistente.',
  })
  async create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponseDto> {
    return BookResponseDto.fromDomain(await this.books.create(dto, user.id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza parcialmente un libro (queda auditado)' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o género inexistente.',
  })
  @ApiNotFoundResponse({ description: 'El libro no existe o fue eliminado.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponseDto> {
    return BookResponseDto.fromDomain(
      await this.books.update(id, dto, user.id),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un libro (soft delete, queda auditado)' })
  @ApiNoContentResponse({ description: 'Libro eliminado.' })
  @ApiNotFoundResponse({
    description: 'El libro no existe o ya fue eliminado.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.books.remove(id, user.id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Sube o reemplaza la imagen de un libro (queda auditado)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadBookImageDto })
  @ApiCreatedResponse({ type: BookResponseDto })
  @ApiBadRequestResponse({
    description: 'Archivo ausente o de tipo no permitido.',
  })
  @ApiPayloadTooLargeResponse({
    description: 'La imagen excede el tamaño máximo.',
  })
  @ApiNotFoundResponse({ description: 'El libro no existe o fue eliminado.' })
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(imageFilePipe) file: ImageFile,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookResponseDto> {
    return BookResponseDto.fromDomain(
      await this.books.updateImage(id, file, user.id),
    );
  }
}
