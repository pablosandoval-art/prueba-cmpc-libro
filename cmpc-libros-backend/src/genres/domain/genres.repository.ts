import type { Genre } from './genre.js';

/** Contrato de persistencia del catálogo de géneros (token DI). */
export abstract class GenresRepository {
  abstract findAll(): Promise<Genre[]>;
  abstract exists(id: number): Promise<boolean>;
}
