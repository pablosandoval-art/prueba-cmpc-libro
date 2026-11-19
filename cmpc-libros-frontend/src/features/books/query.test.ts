import {
  cycleSort,
  hasActiveFilters,
  listKey,
  parseListQuery,
  parseSort,
  serializeSort,
  toApiParams,
  toSearchParams,
} from './query'

describe('parseSort / serializeSort', () => {
  it('interpreta varios campos y descarta inválidos o repetidos', () => {
    expect(parseSort('price:desc,title,foo:asc,title:desc,stock:up')).toEqual([
      { field: 'price', direction: 'desc' },
      { field: 'title', direction: 'asc' },
    ])
    expect(parseSort(null)).toEqual([])
  })

  it('serializa en el formato del backend', () => {
    expect(
      serializeSort([
        { field: 'genre', direction: 'asc' },
        { field: 'price', direction: 'desc' },
      ]),
    ).toBe('genre:asc,price:desc')
  })
})

describe('parseListQuery', () => {
  it('aplica valores por defecto', () => {
    expect(parseListQuery(new URLSearchParams())).toEqual({ page: 1, limit: 10, sort: [] })
  })

  it('lee filtros válidos e ignora valores manipulados', () => {
    const query = parseListQuery(
      new URLSearchParams('title=%20cien%20&author=&genreId=2&available=true&page=3&limit=20&sort=price:desc'),
    )
    expect(query).toEqual({
      title: 'cien',
      genreId: 2,
      available: true,
      page: 3,
      limit: 20,
      sort: [{ field: 'price', direction: 'desc' }],
    })
    expect(parseListQuery(new URLSearchParams('page=-1&limit=999&genreId=abc&available=1'))).toEqual({
      page: 1,
      limit: 10,
      sort: [],
    })
  })

  it('es inverso de toSearchParams', () => {
    const query = parseListQuery(new URLSearchParams('publisher=ana&page=2&limit=50&sort=title:asc'))
    expect(parseListQuery(toSearchParams(query))).toEqual(query)
    expect(toSearchParams({ page: 1, limit: 10, sort: [] }).toString()).toBe('')
  })
})

describe('toApiParams / listKey / hasActiveFilters', () => {
  it('omite filtros vacíos', () => {
    expect(
      toApiParams({
        title: 'x',
        genreId: 1,
        available: true,
        sort: [{ field: 'stock', direction: 'asc' }],
        page: 2,
        limit: 10,
      }),
    ).toEqual({ title: 'x', genreId: 1, available: true, sort: 'stock:asc', page: 2, limit: 10 })
    expect(toApiParams({ sort: [] })).toEqual({})
  })

  it('genera la misma clave para la misma consulta', () => {
    expect(listKey({ page: 1, limit: 10, sort: [] })).toBe('all')
    expect(listKey({ title: 'a', page: 2, limit: 10, sort: [] })).toBe(
      listKey({ page: 2, title: 'a', limit: 10, sort: [] }),
    )
  })

  it('detecta filtros activos', () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ available: true })).toBe(true)
  })
})

describe('cycleSort', () => {
  it('cicla sin orden → asc → desc → sin orden, acumulando columnas', () => {
    let sort = cycleSort([], 'price')
    expect(sort).toEqual([{ field: 'price', direction: 'asc' }])
    sort = cycleSort(sort, 'title')
    expect(sort).toEqual([
      { field: 'price', direction: 'asc' },
      { field: 'title', direction: 'asc' },
    ])
    sort = cycleSort(sort, 'price')
    expect(sort[0]).toEqual({ field: 'price', direction: 'desc' })
    sort = cycleSort(sort, 'price')
    expect(sort).toEqual([{ field: 'title', direction: 'asc' }])
  })
})
