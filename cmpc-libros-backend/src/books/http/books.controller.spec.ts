import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ImageFile } from '../../storage/image-storage.js';
import { BOOK_ID, USER, makeBook } from '../../testing/fixtures.js';
import { BooksService } from '../application/books.service.js';
import { BookResponseDto } from './book.dto.js';
import { BooksController, exportFilename } from './books.controller.js';

async function readStream(file: StreamableFile): Promise<string> {
  let content = '';
  for await (const chunk of file.getStream()) content += String(chunk);
  return content;
}

describe('BooksController', () => {
  let controller: BooksController;
  const service = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateImage: vi.fn(),
    exportCsv: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: service }],
    }).compile();
    controller = moduleRef.get(BooksController);
  });

  it('findAll traduce la query y arma la respuesta paginada', async () => {
    const book = makeBook();
    service.findAll.mockResolvedValue({ items: [book], total: 21 });

    const result = await controller.findAll({
      page: 2,
      limit: 10,
      title: 'cien',
      author: '',
      sort: 'price:desc,title',
    });

    expect(service.findAll).toHaveBeenCalledWith({
      filters: {
        title: 'cien',
        author: undefined,
        publisher: undefined,
        genreId: undefined,
        available: undefined,
      },
      sort: [
        { field: 'price', direction: 'desc' },
        { field: 'title', direction: 'asc' },
      ],
      page: 2,
      limit: 10,
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
    expect(result.data[0]).toBeInstanceOf(BookResponseDto);
    expect(result.data[0]).not.toHaveProperty('deletedAt');
  });

  it('exportCsv devuelve un archivo CSV en streaming con nombre CMPC-LIBROS-<timestamp>', async () => {
    service.exportCsv.mockReturnValue(
      (async function* () {
        yield 'encabezado\r\n';
        yield 'fila\r\n';
      })(),
    );

    const file = controller.exportCsv({ available: true, sort: 'genre:desc' });

    expect(service.exportCsv).toHaveBeenCalledWith(
      expect.objectContaining({ available: true }),
      [{ field: 'genre', direction: 'desc' }],
    );
    const headers = file.getHeaders();
    expect(headers.type).toBe('text/csv; charset=utf-8');
    expect(headers.disposition).toMatch(
      /^attachment; filename="CMPC-LIBROS-\d+\.csv"$/,
    );
    await expect(readStream(file)).resolves.toBe('encabezado\r\nfila\r\n');
  });

  it('exportFilename usa el timestamp de la fecha indicada', () => {
    expect(exportFilename(new Date(1_700_000_000_000))).toBe(
      'CMPC-LIBROS-1700000000000.csv',
    );
  });

  it('findOne devuelve el DTO del libro', async () => {
    service.findOne.mockResolvedValue(makeBook());
    const result = await controller.findOne(BOOK_ID);
    expect(service.findOne).toHaveBeenCalledWith(BOOK_ID);
    expect(result.title).toBe('Cien años de soledad');
  });

  it('create pasa el usuario autenticado para la auditoría', async () => {
    service.create.mockResolvedValue(makeBook());
    const dto = {
      title: 'T',
      authorId: 1,
      publisherId: 2,
      price: 1,
      stock: 1,
      genreId: 1,
    };
    await controller.create(dto, USER);
    expect(service.create).toHaveBeenCalledWith(dto, USER.id);
  });

  it('update pasa id, cambios y usuario', async () => {
    service.update.mockResolvedValue(makeBook({ stock: 0 }));
    const result = await controller.update(BOOK_ID, { stock: 0 }, USER);
    expect(service.update).toHaveBeenCalledWith(BOOK_ID, { stock: 0 }, USER.id);
    expect(result.stock).toBe(0);
  });

  it('remove delega el soft delete', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove(BOOK_ID, USER)).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(BOOK_ID, USER.id);
  });

  it('uploadImage delega la imagen y devuelve el libro actualizado', async () => {
    const file: ImageFile = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      originalname: 'a.png',
      size: 1,
    };
    service.updateImage.mockResolvedValue(
      makeBook({ imageUrl: '/uploads/a.png' }),
    );
    const result = await controller.uploadImage(BOOK_ID, file, USER);
    expect(service.updateImage).toHaveBeenCalledWith(BOOK_ID, file, USER.id);
    expect(result.imageUrl).toBe('/uploads/a.png');
  });
});
