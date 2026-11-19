import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { ALLOWED_IMAGE_TYPES, UPLOADS_PUBLIC_PATH } from './image-storage.js';
import type { ImageFile, ImageStorage, StoredImage } from './image-storage.js';

@Injectable()
export class LocalDiskImageStorage implements ImageStorage {
  private readonly directory: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.directory = resolve(config.get('UPLOADS_DIR', { infer: true }));
  }

  async save(file: ImageFile): Promise<StoredImage> {
    await mkdir(this.directory, { recursive: true });
    // Nombre generado por el servidor: nunca se usa el nombre original del cliente.
    const filename = `${randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype] ?? ''}`;
    await writeFile(join(this.directory, filename), file.buffer);
    return { url: `${UPLOADS_PUBLIC_PATH}/${filename}` };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(`${UPLOADS_PUBLIC_PATH}/`)) return;
    // basename evita path traversal (p. ej. "/uploads/../../.env").
    await rm(join(this.directory, basename(url)), { force: true });
  }
}
