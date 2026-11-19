import { makeBook } from '../../testing/fixtures.js';
import { BooksCsvSerializer, escapeCsvValue } from './books-csv.serializer.js';

describe('escapeCsvValue', () => {
  it.each([
    [1500, '1500'],
    ['simple', 'simple'],
    ['con, coma', '"con, coma"'],
    ['con "comillas"', '"con ""comillas"""'],
    ['línea\nnueva', '"línea\nnueva"'],
  ])('escapa %j como %j (RFC 4180)', (input, expected) => {
    expect(escapeCsvValue(input)).toBe(expected);
  });

  it.each(['=SUM(A1:A2)', '+1', '-1', '@cmd'])(
    'neutraliza la inyección de fórmulas en %j',
    (input) => {
      expect(escapeCsvValue(input)).toBe(`'${input}`);
    },
  );
});

describe('BooksCsvSerializer', () => {
  const serializer = new BooksCsvSerializer();

  it('genera el encabezado con BOM UTF-8 y CRLF', () => {
    const header = serializer.header();
    expect(header.startsWith('﻿')).toBe(true);
    expect(header).toBe(
      '﻿ID,Título,Autor,Editorial,Género,Precio,Disponibilidad,Imagen,Creado,Actualizado\r\n',
    );
  });

  it('genera una fila por libro', () => {
    const csv = serializer.rows([
      makeBook({ imageUrl: '/uploads/a.png' }),
      makeBook({ title: 'Otro, con coma' }),
    ]);
    const lines = csv.split('\r\n');

    expect(lines).toHaveLength(3); // 2 filas + string vacío final
    expect(lines[0]).toBe(
      '22222222-2222-4222-8222-222222222222,Cien años de soledad,Gabriel García Márquez,Sudamericana,Ficción,18990,14,/uploads/a.png,2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z',
    );
    expect(lines[1]).toContain('"Otro, con coma"');
    expect(lines[1]).toContain(',14,,'); // imagen vacía
  });
});
