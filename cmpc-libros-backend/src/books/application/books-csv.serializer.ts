import { Injectable } from '@nestjs/common';
import type { Book } from '../domain/book.js';

interface CsvColumn {
  header: string;
  value: (book: Book) => string | number;
}

const COLUMNS: readonly CsvColumn[] = [
  { header: 'ID', value: (b) => b.id },
  { header: 'Título', value: (b) => b.title },
  { header: 'Autor', value: (b) => b.author.name },
  { header: 'Editorial', value: (b) => b.publisher.name },
  { header: 'Género', value: (b) => b.genre.name },
  { header: 'Precio', value: (b) => b.price },
  { header: 'Disponibilidad', value: (b) => b.stock },
  { header: 'Imagen', value: (b) => b.imageUrl ?? '' },
  { header: 'Creado', value: (b) => b.createdAt.toISOString() },
  { header: 'Actualizado', value: (b) => b.updatedAt.toISOString() },
];

/** BOM UTF-8: permite que Excel muestre correctamente tildes y eñes. */
const UTF8_BOM = '﻿';
const LINE_BREAK = '\r\n';
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * Escapa un valor según RFC 4180 y neutraliza la inyección de fórmulas
 * (CSV injection): un texto que empieza con =, +, -, @ se antepone con '.
 */
export function escapeCsvValue(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Serializa libros a CSV (responsabilidad única: formato, no acceso a datos). */
@Injectable()
export class BooksCsvSerializer {
  header(): string {
    return (
      UTF8_BOM +
      COLUMNS.map((c) => escapeCsvValue(c.header)).join(',') +
      LINE_BREAK
    );
  }

  rows(books: readonly Book[]): string {
    return books
      .map(
        (book) =>
          COLUMNS.map((c) => escapeCsvValue(c.value(book))).join(',') +
          LINE_BREAK,
      )
      .join('');
  }
}
