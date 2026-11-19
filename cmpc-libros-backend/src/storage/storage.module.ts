import { Module } from '@nestjs/common';
import { ImageStorage } from './image-storage.js';
import { LocalDiskImageStorage } from './local-disk-image-storage.js';

@Module({
  providers: [{ provide: ImageStorage, useClass: LocalDiskImageStorage }],
  exports: [ImageStorage],
})
export class StorageModule {}
