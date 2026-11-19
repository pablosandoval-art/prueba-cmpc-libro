import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CatalogItemResponseDto } from '../../common/catalog/catalog.dto.js';
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from '../../common/pagination/pagination.dto.js';
import { ToBoolean, Trim } from '../../common/transformers/trim.transformer.js';
import { BOOK_SORT_FIELDS } from '../domain/book.js';
import type { Book } from '../domain/book.js';

export const MAX_PRICE = 100_000_000;
export const MAX_STOCK = 1_000_000;

const SORT_TERM = `(${BOOK_SORT_FIELDS.join('|')})(:(asc|desc))?`;
export const SORT_PATTERN = new RegExp(`^${SORT_TERM}(,${SORT_TERM})*$`);

// ---------- Escritura ----------

export class CreateBookDto {
  @ApiProperty({ example: 'Cien años de soledad', maxLength: 200 })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 1,
    description: 'Id del autor (ver GET /authors; POST /authors para crearlo)',
  })
  @IsInt({ message: 'Selecciona un autor' })
  @Min(1)
  authorId: number;

  @ApiProperty({
    example: 1,
    description:
      'Id de la editorial (ver GET /publishers; POST /publishers para crearla)',
  })
  @IsInt({ message: 'Selecciona una editorial' })
  @Min(1)
  publisherId: number;

  @ApiProperty({
    example: 15990,
    minimum: 0,
    maximum: MAX_PRICE,
    description: 'Precio en CLP (entero)',
  })
  @IsInt({ message: 'El precio debe ser un número entero' })
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  @ApiProperty({
    example: 12,
    minimum: 0,
    maximum: MAX_STOCK,
    description: 'Disponibilidad (unidades en stock)',
  })
  @IsInt({ message: 'La disponibilidad debe ser un número entero' })
  @Min(0)
  @Max(MAX_STOCK)
  stock: number;

  @ApiProperty({ example: 1, description: 'Id del género (ver GET /genres)' })
  @IsInt()
  @Min(1)
  genreId: number;
}

export class UpdateBookDto extends PartialType(CreateBookDto) {}

// ---------- Lectura ----------

export class BookFiltersQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda parcial por título' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Búsqueda parcial por nombre del autor' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(150)
  author?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda parcial por nombre de la editorial',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(150)
  publisher?: string;

  @ApiPropertyOptional({ description: 'Id del género' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  genreId?: number;

  @ApiPropertyOptional({
    description: 'true: sólo con stock; false: sólo sin stock; ausente: todos',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({
    description: `Orden multi-campo "campo:dir" separado por comas. Campos: ${BOOK_SORT_FIELDS.join(', ')}. Dirección por defecto: asc.`,
    example: 'genre:asc,price:desc',
  })
  @IsOptional()
  @Matches(SORT_PATTERN, { message: 'Formato de orden inválido' })
  sort?: string;
}

export class ListBooksQueryDto extends IntersectionType(
  BookFiltersQueryDto,
  PaginationQueryDto,
) {}

export class GenreSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ficción' })
  name: string;
}

export class BookResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Cien años de soledad' })
  title: string;

  @ApiProperty({ type: CatalogItemResponseDto })
  author: CatalogItemResponseDto;

  @ApiProperty({ type: CatalogItemResponseDto })
  publisher: CatalogItemResponseDto;

  @ApiProperty({ example: 15990 })
  price: number;

  @ApiProperty({ example: 12 })
  stock: number;

  @ApiProperty({ type: GenreSummaryDto })
  genre: GenreSummaryDto;

  @ApiProperty({ type: String, nullable: true, example: '/uploads/3f2c.jpg' })
  imageUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromDomain(book: Book): BookResponseDto {
    return Object.assign(new BookResponseDto(), {
      id: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      price: book.price,
      stock: book.stock,
      genre: book.genre,
      imageUrl: book.imageUrl,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    });
  }
}

export class PaginatedBooksResponseDto {
  @ApiProperty({ type: BookResponseDto, isArray: true })
  data: BookResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class UploadBookImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'JPEG, PNG o WebP',
  })
  image: unknown;
}
