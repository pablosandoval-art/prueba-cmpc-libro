import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuthorsService } from '../../authors/application/authors.service.js';
import { UnitOfWork } from '../../database/unit-of-work.js';
import { GenresService } from '../../genres/application/genres.service.js';
import { PublishersService } from '../../publishers/application/publishers.service.js';
import { ImageStorage } from '../../storage/image-storage.js';
import type { ImageFile } from '../../storage/image-storage.js';
import { BOOK_ID, USER, batches, makeBook } from '../../testing/fixtures.js';
import { DEFAULT_BOOK_SORT } from '../domain/book.js';
import { BooksRepository } from '../domain/books.repository.js';
import { BooksCsvSerializer } from './books-csv.serializer.js';
import {
  BOOK_ENTITY,
  BooksService,
  EXPORT_BATCH_SIZE,
} from './books.service.js';

describe('BooksService', () => {
  let service: BooksService;

  const books = {
    findMany: vi.fn(),
    findActiveById: vi.fn(),
    findAllInBatches: vi.fn(),
  };
  // Repositorios ligados a la transacción que entrega el UnitOfWork.
  const txBooks = {
    findActiveById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
  const txAuditLogs = { create: vi.fn() };
  const ctx = { books: txBooks, auditLogs: txAuditLogs };
  const unitOfWork = { run: vi.fn() };
  const audit = { record: vi.fn() };
  const genres = { exists: vi.fn() };
  const authors = { exists: vi.fn() };
  const publishers = { exists: vi.fn() };
  const imageStorage = { save: vi.fn(), delete: vi.fn() };

  const image: ImageFile = {
    buffer: Buffer.from('img'),
    mimetype: 'image/png',
    originalname: 'portada.png',
    size: 3,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    unitOfWork.run.mockImplementation((work: (c: typeof ctx) => unknown) =>
      work(ctx),
    );
    genres.exists.mockResolvedValue(true);
    authors.exists.mockResolvedValue(true);
    publishers.exists.mockResolvedValue(true);

    const moduleRef = await Test.createTestingModule({
      providers: [
        BooksService,
        BooksCsvSerializer,
        { provide: BooksRepository, useValue: books },
        { provide: UnitOfWork, useValue: unitOfWork },
        { provide: AuditService, useValue: audit },
        { provide: GenresService, useValue: genres },
        { provide: AuthorsService, useValue: authors },
        { provide: PublishersService, useValue: publishers },
        { provide: ImageStorage, useValue: imageStorage },
      ],
    }).compile();

    service = moduleRef.get(BooksService);
  });

  describe('findAll', () => {
    it('delega la consulta paginada al repositorio', async () => {
      const page = { items: [makeBook()], total: 1 };
      books.findMany.mockResolvedValue(page);
      const query = {
        filters: {},
        sort: DEFAULT_BOOK_SORT,
        page: 1,
        limit: 10,
      };

      await expect(service.findAll(query)).resolves.toBe(page);
      expect(books.findMany).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('devuelve el libro activo', async () => {
      const book = makeBook();
      books.findActiveById.mockResolvedValue(book);
      await expect(service.findOne(BOOK_ID)).resolves.toBe(book);
    });

    it('lanza NotFound si no existe o está eliminado', async () => {
      books.findActiveById.mockResolvedValue(null);
      await expect(service.findOne(BOOK_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const data = {
      title: 'Nuevo',
      authorId: 4,
      publisherId: 7,
      price: 1000,
      stock: 3,
      genreId: 1,
    };

    it('crea el libro y registra la auditoría en la misma transacción', async () => {
      const created = makeBook({ title: 'Nuevo' });
      txBooks.create.mockResolvedValue(created);

      await expect(service.create(data, USER.id)).resolves.toBe(created);

      expect(unitOfWork.run).toHaveBeenCalledTimes(1);
      expect(txBooks.create).toHaveBeenCalledWith(data);
      expect(audit.record).toHaveBeenCalledWith(ctx, {
        entityType: BOOK_ENTITY,
        entityId: created.id,
        action: 'CREATE',
        userId: USER.id,
        before: null,
        after: created,
      });
    });

    it('rechaza un género inexistente sin abrir transacción', async () => {
      genres.exists.mockResolvedValue(false);

      await expect(service.create(data, USER.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(unitOfWork.run).not.toHaveBeenCalled();
    });

    it('valida que el autor y la editorial existan', async () => {
      txBooks.create.mockResolvedValue(makeBook());
      await service.create(data, USER.id);
      expect(authors.exists).toHaveBeenCalledWith(4);
      expect(publishers.exists).toHaveBeenCalledWith(7);

      authors.exists.mockResolvedValue(false);
      await expect(service.create(data, USER.id)).rejects.toThrow(
        'El autor 4 no existe',
      );

      authors.exists.mockResolvedValue(true);
      publishers.exists.mockResolvedValue(false);
      await expect(service.create(data, USER.id)).rejects.toThrow(
        'La editorial 7 no existe',
      );
    });

    it('al actualizar sólo valida las referencias que vienen en los datos', async () => {
      txBooks.findActiveById.mockResolvedValue(makeBook());
      txBooks.update.mockResolvedValue(makeBook());
      await service.update(BOOK_ID, { authorId: 9 }, USER.id);
      expect(authors.exists).toHaveBeenCalledWith(9);
      expect(publishers.exists).not.toHaveBeenCalled();
      expect(genres.exists).not.toHaveBeenCalled();
    });

    it('propaga el error si la auditoría falla (la transacción se revierte)', async () => {
      txBooks.create.mockResolvedValue(makeBook());
      audit.record.mockRejectedValue(new Error('fallo de auditoría'));

      await expect(service.create(data, USER.id)).rejects.toThrow(
        'fallo de auditoría',
      );
    });
  });

  describe('update', () => {
    it('actualiza y audita con estado previo y posterior', async () => {
      const before = makeBook();
      const after = makeBook({ price: 20000 });
      txBooks.findActiveById.mockResolvedValue(before);
      txBooks.update.mockResolvedValue(after);

      await expect(
        service.update(BOOK_ID, { price: 20000 }, USER.id),
      ).resolves.toBe(after);

      expect(genres.exists).not.toHaveBeenCalled();
      expect(txBooks.update).toHaveBeenCalledWith(BOOK_ID, { price: 20000 });
      expect(audit.record).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'UPDATE', before, after }),
      );
    });

    it('valida el género cuando se modifica', async () => {
      genres.exists.mockResolvedValue(false);

      await expect(
        service.update(BOOK_ID, { genreId: 99 }, USER.id),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(genres.exists).toHaveBeenCalledWith(99);
    });

    it('lanza NotFound si el libro no existe', async () => {
      txBooks.findActiveById.mockResolvedValue(null);

      await expect(
        service.update(BOOK_ID, { price: 1 }, USER.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(txBooks.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('aplica soft delete y audita la eliminación', async () => {
      const before = makeBook();
      const after = makeBook({ deletedAt: new Date() });
      txBooks.findActiveById.mockResolvedValue(before);
      txBooks.softDelete.mockResolvedValue(after);

      await expect(service.remove(BOOK_ID, USER.id)).resolves.toBeUndefined();

      expect(txBooks.softDelete).toHaveBeenCalledWith(BOOK_ID);
      expect(audit.record).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'DELETE', before, after }),
      );
    });

    it('lanza NotFound si el libro no existe', async () => {
      txBooks.findActiveById.mockResolvedValue(null);

      await expect(service.remove(BOOK_ID, USER.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(txBooks.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('updateImage', () => {
    it('guarda la imagen, actualiza el libro y borra la imagen anterior', async () => {
      const before = makeBook({ imageUrl: '/uploads/vieja.png' });
      const after = makeBook({ imageUrl: '/uploads/nueva.png' });
      imageStorage.save.mockResolvedValue({ url: '/uploads/nueva.png' });
      txBooks.findActiveById.mockResolvedValue(before);
      txBooks.update.mockResolvedValue(after);

      await expect(service.updateImage(BOOK_ID, image, USER.id)).resolves.toBe(
        after,
      );

      expect(imageStorage.save).toHaveBeenCalledWith(image);
      expect(txBooks.update).toHaveBeenCalledWith(BOOK_ID, {
        imageUrl: '/uploads/nueva.png',
      });
      expect(audit.record).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ action: 'UPDATE', before, after }),
      );
      expect(imageStorage.delete).toHaveBeenCalledWith('/uploads/vieja.png');
    });

    it('no borra nada si el libro no tenía imagen', async () => {
      imageStorage.save.mockResolvedValue({ url: '/uploads/nueva.png' });
      txBooks.findActiveById.mockResolvedValue(makeBook());
      txBooks.update.mockResolvedValue(makeBook());

      await service.updateImage(BOOK_ID, image, USER.id);

      expect(imageStorage.delete).not.toHaveBeenCalled();
    });

    it('borra la imagen nueva si la transacción falla', async () => {
      imageStorage.save.mockResolvedValue({ url: '/uploads/nueva.png' });
      txBooks.findActiveById.mockResolvedValue(null);

      await expect(
        service.updateImage(BOOK_ID, image, USER.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(imageStorage.delete).toHaveBeenCalledWith('/uploads/nueva.png');
    });

    it('registra un warning si no puede borrar la imagen anterior', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      imageStorage.save.mockResolvedValue({ url: '/uploads/nueva.png' });
      imageStorage.delete.mockRejectedValue(new Error('EACCES'));
      txBooks.findActiveById.mockResolvedValue(
        makeBook({ imageUrl: '/uploads/vieja.png' }),
      );
      txBooks.update.mockResolvedValue(makeBook());

      await expect(
        service.updateImage(BOOK_ID, image, USER.id),
      ).resolves.toBeDefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('vieja.png'));
    });
  });

  describe('exportCsv', () => {
    it('emite el encabezado y luego un bloque por cada lote', async () => {
      const first = [makeBook({ title: 'A' })];
      const second = [makeBook({ title: 'B' })];
      books.findAllInBatches.mockReturnValue(batches(first, second));
      const filters = { genreId: 1 };

      const chunks: string[] = [];
      for await (const chunk of service.exportCsv(filters, DEFAULT_BOOK_SORT)) {
        chunks.push(chunk);
      }

      expect(books.findAllInBatches).toHaveBeenCalledWith(
        filters,
        DEFAULT_BOOK_SORT,
        EXPORT_BATCH_SIZE,
      );
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toContain('Título');
      expect(chunks[1]).toContain(',A,');
      expect(chunks[2]).toContain(',B,');
    });
  });
});
