import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from '../../common/pagination/pagination.dto.js';
import { Trim } from '../../common/transformers/trim.transformer.js';
import { AUDIT_ACTIONS } from '../domain/audit-log.js';
import type { AuditAction, AuditLog } from '../domain/audit-log.js';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Book', description: 'Tipo de entidad' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Id de la entidad auditada' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Usuario que operó' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;

  @ApiPropertyOptional({
    example: '2026-11-18T00:00:00-03:00',
    description:
      'Operaciones desde este instante (inclusive). ISO 8601; si no lleva zona horaria se asume UTC',
  })
  @IsOptional()
  @Trim()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-18T23:59:59.999-03:00',
    description:
      'Operaciones hasta este instante (inclusive). ISO 8601; no puede ser anterior a `from`',
  })
  @IsOptional()
  @Trim()
  @IsISO8601({ strict: true })
  to?: string;
}

export class AuditUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'admin@cmpc.cl' })
  email: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Book' })
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ enum: AUDIT_ACTIONS })
  action: AuditAction;

  @ApiProperty({ type: AuditUserDto })
  user: AuditUserDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Estado previo (null en CREATE)',
  })
  before: Record<string, unknown> | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Estado posterior',
  })
  after: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  static fromDomain(log: AuditLog): AuditLogResponseDto {
    return Object.assign(new AuditLogResponseDto(), {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      user: log.user,
      before: log.before,
      after: log.after,
      createdAt: log.createdAt,
    });
  }
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: AuditLogResponseDto, isArray: true })
  data: AuditLogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
