import { apiClient } from '../../../lib/http/api-client'
import { call } from '../../../lib/http/call'
import { toApiParams } from '../query'
import type { Book, BookFilters, BookInput, BookListQuery, Genre, Paginated, SortTerm } from '../types'

export const booksService = {
  list(query: BookListQuery, signal?: AbortSignal): Promise<Paginated<Book>> {
    return call(() =>
      apiClient.get<Paginated<Book>>('/books', {
        params: toApiParams(query),
        signal,
      }),
    )
  },

  get(id: string, signal?: AbortSignal): Promise<Book> {
    return call(() => apiClient.get<Book>(`/books/${id}`, { signal }))
  },

  create(input: BookInput): Promise<Book> {
    return call(() => apiClient.post<Book>('/books', input))
  },

  update(id: string, input: Partial<BookInput>): Promise<Book> {
    return call(() => apiClient.patch<Book>(`/books/${id}`, input))
  },

  async remove(id: string): Promise<void> {
    await call(() => apiClient.delete(`/books/${id}`))
  },

  uploadImage(id: string, file: File): Promise<Book> {
    const form = new FormData()
    form.append('image', file)
    return call(() => apiClient.post<Book>(`/books/${id}/image`, form))
  },

  /** CSV generado en el servidor con los filtros y el orden activos. */
  exportCsv(query: BookFilters & { sort: readonly SortTerm[] }): Promise<Blob> {
    return call(() =>
      apiClient.get<Blob>('/books/export', {
        params: toApiParams(query),
        responseType: 'blob',
      }),
    )
  },
}

export const genresService = {
  list(): Promise<Genre[]> {
    return call(() => apiClient.get<Genre[]>('/genres'))
  },
}
