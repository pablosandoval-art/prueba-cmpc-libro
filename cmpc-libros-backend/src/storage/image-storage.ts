/** Archivo de imagen recibido, desacoplado del tipo de Multer. */
export interface ImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface StoredImage {
  /** URL pública relativa, p. ej. `/uploads/<uuid>.jpg`. */
  url: string;
}

/** Ruta pública bajo la que se sirven las imágenes subidas. */
export const UPLOADS_PUBLIC_PATH = '/uploads';

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Contrato de almacenamiento de imágenes (token DI).
 * Implementación actual: disco local. Sustituible por S3 u otro sin tocar servicios.
 */
export abstract class ImageStorage {
  abstract save(file: ImageFile): Promise<StoredImage>;
  abstract delete(url: string): Promise<void>;
}
