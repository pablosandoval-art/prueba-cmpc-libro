import { apiClient } from '../../../lib/http/api-client'
import { call } from '../../../lib/http/call'
import type { Paginated } from '../../books/types'
import { toAuditApiParams } from '../query'
import type { AuditListQuery, AuditLog } from '../types'

export const auditService = {
  list(query: AuditListQuery, signal?: AbortSignal): Promise<Paginated<AuditLog>> {
    return call(() =>
      apiClient.get<Paginated<AuditLog>>('/audit-logs', {
        params: toAuditApiParams(query),
        signal,
      }),
    )
  },
}
