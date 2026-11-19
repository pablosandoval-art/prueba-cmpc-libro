import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { NamedCatalogService } from '../../common/catalog/named-catalog.service.js';
import { UnitOfWork } from '../../database/unit-of-work.js';
import { PublishersRepository } from '../domain/publishers.repository.js';

@Injectable()
export class PublishersService extends NamedCatalogService {
  constructor(
    publishers: PublishersRepository,
    unitOfWork: UnitOfWork,
    audit: AuditService,
  ) {
    super(publishers, unitOfWork, audit, 'Publisher', (ctx) => ctx.publishers);
  }
}
