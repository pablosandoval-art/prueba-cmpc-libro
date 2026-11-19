import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { LocalDiskImageStorage } from './local-disk-image-storage.js';

describe('LocalDiskImageStorage', () => {
  let directory: string;
  let storage: LocalDiskImageStorage;

  beforeEach(async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmpc-uploads-'));
    directory = join(root, 'uploads'); // aún no existe: save debe crearlo
    const config = { get: () => directory };
    storage = new LocalDiskImageStorage(
      config as unknown as ConfigService<EnvironmentVariables, true>,
    );
  });

  afterEach(async () => {
    await rm(join(directory, '..'), { recursive: true, force: true });
  });

  it('guarda con nombre generado y extensión según el MIME', async () => {
    const { url } = await storage.save({
      buffer: Buffer.from('png-bytes'),
      mimetype: 'image/png',
      originalname: '../../malicioso.exe',
      size: 9,
    });

    expect(url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    const filename = url.split('/').pop()!;
    await expect(readFile(join(directory, filename), 'utf8')).resolves.toBe(
      'png-bytes',
    );
  });

  it('elimina un archivo previamente guardado', async () => {
    const { url } = await storage.save({
      buffer: Buffer.from('x'),
      mimetype: 'image/jpeg',
      originalname: 'a.jpg',
      size: 1,
    });
    await storage.delete(url);
    expect(existsSync(join(directory, url.split('/').pop()!))).toBe(false);
  });

  it('ignora URLs ajenas y no permite path traversal', async () => {
    const outside = join(directory, '..', 'secreto.txt');
    await writeFile(outside, 'no borrar');

    await storage.delete('https://otro-servidor/imagen.png');
    await storage.delete('/uploads/../secreto.txt');

    await expect(readFile(outside, 'utf8')).resolves.toBe('no borrar');
  });
});
