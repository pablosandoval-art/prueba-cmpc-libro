import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../transformers/trim.transformer.js';

export const CATALOG_NAME_MAX = 150;
export const CATALOG_SEARCH_MAX_LIMIT = 50;

export class CatalogItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Gabriel García Márquez' })
  name: string;
}

export class CatalogSearchQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda parcial por nombre' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(CATALOG_NAME_MAX)
  search?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CATALOG_SEARCH_MAX_LIMIT,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CATALOG_SEARCH_MAX_LIMIT)
  limit: number = 20;
}

export class CreateCatalogItemDto {
  @ApiProperty({
    example: 'Isabel Allende',
    maxLength: CATALOG_NAME_MAX,
    description:
      'Si ya existe un registro con ese nombre (sin distinguir mayúsculas) se devuelve el existente.',
  })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(CATALOG_NAME_MAX)
  name: string;
}
