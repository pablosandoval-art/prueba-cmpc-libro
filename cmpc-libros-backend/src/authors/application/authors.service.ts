import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { NamedCatalogService } from '../../common/catalog/named-catalog.service.js';
import { UnitOfWork } from '../../database/unit-of-work.js';
import { AuthorsRepository } from '../domain/authors.repository.js';

@Injectable()
export class AuthorsService extends NamedCatalogService {
  constructor(
    authors: AuthorsRepository,
    unitOfWork: UnitOfWork,
    audit: AuditService,
  ) {
    super(authors, unitOfWork, audit, 'Author', (ctx) => ctx.authors);
  }
}
