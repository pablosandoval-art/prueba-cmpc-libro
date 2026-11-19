import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE } from '../../auth/http/auth-cookie.js';
import { buildPaginationMeta } from '../../common/pagination/pagination.js';
import { AuditService } from '../application/audit.service.js';
import {
  AuditLogResponseDto,
  ListAuditLogsQueryDto,
  PaginatedAuditLogsResponseDto,
} from './audit-log.dto.js';

@ApiTags('audit')
@ApiBearerAuth()
@ApiCookieAuth(AUTH_COOKIE)
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({
    summary:
      'Consulta la bitácora de operaciones (creación, edición, eliminación)',
  })
  @ApiOkResponse({ type: PaginatedAuditLogsResponseDto })
  @ApiBadRequestResponse({
    description: 'Parámetros inválidos (p. ej. `from` posterior a `to`).',
  })
  async findAll(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const { page, limit, from, to, ...rest } = query;
    const filters = {
      ...rest,
      ...(from && { from: new Date(from) }),
      ...(to && { to: new Date(to) }),
    };
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new BadRequestException('`from` no puede ser posterior a `to`');
    }
    const result = await this.audit.findAll({ filters, page, limit });
    return {
      data: result.items.map((log) => AuditLogResponseDto.fromDomain(log)),
      meta: buildPaginationMeta({ page, limit }, result.total),
    };
  }
}
