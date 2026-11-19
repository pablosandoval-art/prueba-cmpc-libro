import { Injectable } from '@nestjs/common';
import type { Genre } from '../domain/genre.js';
import { GenresRepository } from '../domain/genres.repository.js';

@Injectable()
export class GenresService {
  constructor(private readonly genres: GenresRepository) {}

  findAll(): Promise<Genre[]> {
    return this.genres.findAll();
  }

  exists(id: number): Promise<boolean> {
    return this.genres.exists(id);
  }
}
