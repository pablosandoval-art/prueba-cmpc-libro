import { DEFAULT_BOOK_SORT } from '../domain/book.js';
import { SORT_PATTERN } from './book.dto.js';
import { parseSort, toBookFilters } from './book-query.mapper.js';

describe('parseSort', () => {
  it('usa el orden por defecto si no se indica', () => {
    expect(parseSort(undefined)).toBe(DEFAULT_BOOK_SORT);
    expect(parseSort('')).toBe(DEFAULT_BOOK_SORT);
  });

  it('interpreta múltiples campos con dirección por defecto asc', () => {
    expect(parseSort('genre,price:desc')).toEqual([
      { field: 'genre', direction: 'asc' },
      { field: 'price', direction: 'desc' },
    ]);
  });

  it('ignora campos repetidos conservando la primera aparición', () => {
    expect(parseSort('title:desc,title:asc')).toEqual([
      { field: 'title', direction: 'desc' },
    ]);
  });
});

describe('SORT_PATTERN', () => {
  it.each(['title', 'price:desc', 'genre:asc,stock:desc,createdAt'])(
    'acepta %j',
    (value) => expect(SORT_PATTERN.test(value)).toBe(true),
  );

  it.each(['password', 'title:up', 'title,', ',title', 'title;drop'])(
    'rechaza %j',
    (value) => expect(SORT_PATTERN.test(value)).toBe(false),
  );
});

describe('toBookFilters', () => {
  it('trata los strings vacíos como ausencia de filtro', () => {
    expect(
      toBookFilters({
        title: '',
        author: 'x',
        publisher: '',
        available: false,
      }),
    ).toEqual({
      title: undefined,
      author: 'x',
      publisher: undefined,
      genreId: undefined,
      available: false,
    });
  });
});
