import { describe, expect, it } from 'vitest'
import { AUDIT_LOGS, BOOKS, makeAuditLog } from '../../test/fixtures'
import { changedFields, entityLabel, formatField, recordName, snapshotFields, summarize } from './describe'

const [update, create, remove] = AUDIT_LOGS

describe('descripción de la auditoría', () => {
  it('etiqueta las entidades y deja pasar las desconocidas', () => {
    expect(entityLabel('Book')).toBe('Libro')
    expect(entityLabel('Publisher')).toBe('Editorial')
    expect(entityLabel('Shelf')).toBe('Shelf')
  })

  it('formatea cada tipo de valor', () => {
    expect(formatField('price', 19990)).toBe('$19.990')
    expect(formatField('stock', 1234)).toBe('1.234')
    expect(formatField('author', { id: 1, name: 'Ana' })).toBe('Ana')
    expect(formatField('imageUrl', '/uploads/x.png')).toBe('Con portada')
    expect(formatField('imageUrl', null)).toBe('—')
    expect(formatField('deletedAt', '2026-11-18T13:00:00.000Z')).toMatch(/2026/)
    expect(formatField('flag', true)).toBe('Sí')
    expect(formatField('flag', false)).toBe('No')
    expect(formatField('misc', { a: 1 })).toBe('{"a":1}')
    expect(formatField('misc', 5)).toBe('5')
  })

  it('en una edición lista sólo lo que cambió, en orden, sin datos técnicos', () => {
    expect(changedFields(update)).toEqual([
      { key: 'price', label: 'Precio', before: '$18.990', after: '$19.990' },
      { key: 'stock', label: 'Disponibilidad', before: '14', after: '20' },
    ])
  })

  it('compara autor y editorial por id, no por referencia', () => {
    const log = makeAuditLog({
      before: { ...BOOKS[0], author: { id: 1, name: 'Ana' } },
      after: { ...BOOKS[0], author: { id: 1, name: 'Ana' }, publisher: { id: 9, name: 'Nueva' } },
    })
    expect(changedFields(log).map((c) => c.key)).toEqual(['publisher'])
  })

  it('muestra los campos desconocidos al final', () => {
    const log = makeAuditLog({ before: { zeta: 1 }, after: { alfa: 'x', zeta: 2, price: 1 } })
    expect(changedFields(log).map((c) => c.key)).toEqual(['price', 'alfa', 'zeta'])
  })

  it('describe una creación y una baja con el registro completo', () => {
    expect(snapshotFields(create.after)).toEqual([{ key: 'name', label: 'Nombre', value: 'Clarice Lispector' }])
    expect(snapshotFields(remove.before).map((f) => f.key)).toEqual([
      'title',
      'author',
      'publisher',
      'genre',
      'price',
      'stock',
      'imageUrl',
    ])
    expect(snapshotFields(remove.after).map((f) => f.key)).toContain('deletedAt')
    expect(snapshotFields(null)).toEqual([])
  })

  it('resuelve el nombre del registro con respaldo en el id', () => {
    expect(recordName(update)).toBe('Cien años de soledad')
    expect(recordName(create)).toBe('Clarice Lispector')
    expect(recordName(remove)).toBe('Rayuela')
    expect(recordName(makeAuditLog({ before: null, after: null, entityId: 'abc' }))).toBe('abc')
  })

  it('resume en una línea', () => {
    expect(summarize(update)).toBe('Precio, Disponibilidad')
    expect(summarize(create)).toBe('Registro nuevo')
    expect(summarize(remove)).toBe('Baja lógica del registro')
    expect(summarize(makeAuditLog({ after: { ...(update.before as object), updatedAt: 'otra' } }))).toBe(
      'Sin cambios en campos visibles',
    )
  })
})
