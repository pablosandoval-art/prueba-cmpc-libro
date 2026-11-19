import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuthorsService } from '../../authors/application/authors.service.js';
import type { Page } from '../../common/pagination/pagination.js';
import { UnitOfWork } from '../../database/unit-of-work.js';
import type { TransactionContext } from '../../database/unit-of-work.js';
import { GenresService } from '../../genres/application/genres.service.js';
import { PublishersService } from '../../publishers/application/publishers.service.js';
import { ImageStorage } from '../../storage/image-storage.js';
import type { ImageFile } from '../../storage/image-storage.js';
import type {
  Book,
  BookFilters,
  BookQuery,
  BookSort,
  CreateBookData,
  UpdateBookData,
} from '../domain/book.js';
import { BooksRepository } from '../domain/books.repository.js';
import { BooksCsvSerializer } from './books-csv.serializer.js';

export const BOOK_ENTITY = 'Book';

interface ExistenceCheck {
  exists(id: number): Promise<boolean>;
}
export const EXPORT_BATCH_SIZE = 500;

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly books: BooksRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditService,
    private readonly genres: GenresService,
    private readonly authors: AuthorsService,
    private readonly publishers: PublishersService,
    private readonly imageStorage: ImageStorage,
    private readonly csv: BooksCsvSerializer,
  ) {}

  findAll(query: BookQuery): Promise<Page<Book>> {
    return this.books.findMany(query);
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.books.findActiveById(id);
    if (!book) throw this.notFound(id);
    return book;
  }

  async create(data: CreateBookData, userId: string): Promise<Book> {
    await this.assertReferencesExist(data);
    return this.unitOfWork.run(async (ctx) => {
      const book = await ctx.books.create(data);
      await this.audit.record(ctx, {
        entityType: BOOK_ENTITY,
        entityId: book.id,
        action: 'CREATE',
        userId,
        before: null,
        after: book,
      });
      return book;
    });
  }

  async update(
    id: string,
    data: UpdateBookData,
    userId: string,
  ): Promise<Book> {
    await this.assertReferencesExist(data);
    return this.unitOfWork.run((ctx) =>
      this.updateWithAudit(ctx, id, data, userId),
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.unitOfWork.run(async (ctx) => {
      const before = await this.findActiveOrFail(ctx, id);
      const after = await ctx.books.softDelete(id);
      await this.audit.record(ctx, {
        entityType: BOOK_ENTITY,
        entityId: id,
        action: 'DELETE',
        userId,
        before,
        after,
      });
    });
  }

  /**
   * Guarda la imagen y actualiza el libro de forma atómica. Si la transacción
   * falla, se borra el archivo nuevo; si se confirma, se borra el anterior.
   */
  async updateImage(
    id: string,
    file: ImageFile,
    userId: string,
  ): Promise<Book> {
    const stored = await this.imageStorage.save(file);
    let previousUrl: string | null;
    let updated: Book;
    try {
      [previousUrl, updated] = await this.unitOfWork.run(async (ctx) => {
        const before = await this.findActiveOrFail(ctx, id);
        const after = await this.updateWithAudit(
          ctx,
          id,
          { imageUrl: stored.url },
          userId,
          before,
        );
        return [before.imageUrl, after] as const;
      });
    } catch (error) {
      await this.safeDeleteImage(stored.url);
      throw error;
    }
    if (previousUrl) await this.safeDeleteImage(previousUrl);
    return updated;
  }

  /** Genera el CSV por lotes: la memoria usada no crece con el total de libros. */
  async *exportCsv(
    filters: BookFilters,
    sort: readonly BookSort[],
  ): AsyncGenerator<string> {
    yield this.csv.header();
    for await (const batch of this.books.findAllInBatches(
      filters,
      sort,
      EXPORT_BATCH_SIZE,
    )) {
      yield this.csv.rows(batch);
    }
  }

  private async updateWithAudit(
    ctx: TransactionContext,
    id: string,
    data: UpdateBookData,
    userId: string,
    knownBefore?: Book,
  ): Promise<Book> {
    const before = knownBefore ?? (await this.findActiveOrFail(ctx, id));
    const after = await ctx.books.update(id, data);
    await this.audit.record(ctx, {
      entityType: BOOK_ENTITY,
      entityId: id,
      action: 'UPDATE',
      userId,
      before,
      after,
    });
    return after;
  }

  private async findActiveOrFail(
    ctx: TransactionContext,
    id: string,
  ): Promise<Book> {
    const book = await ctx.books.findActiveById(id);
    if (!book) throw this.notFound(id);
    return book;
  }

  /** Valida las referencias (género, autor, editorial) presentes en los datos. */
  private async assertReferencesExist(
    data: Pick<UpdateBookData, 'genreId' | 'authorId' | 'publisherId'>,
  ): Promise<void> {
    const checks: Array<[number | undefined, string, ExistenceCheck]> = [
      [data.genreId, 'El género', this.genres],
      [data.authorId, 'El autor', this.authors],
      [data.publisherId, 'La editorial', this.publishers],
    ];
    for (const [id, label, catalog] of checks) {
      if (id !== undefined && !(await catalog.exists(id))) {
        throw new BadRequestException(`${label} ${id} no existe`);
      }
    }
  }

  private async safeDeleteImage(url: string): Promise<void> {
    try {
      await this.imageStorage.delete(url);
    } catch (error) {
      this.logger.warn(
        `No se pudo eliminar la imagen ${url}: ${String(error)}`,
      );
    }
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Libro ${id} no encontrado`);
  }
}
