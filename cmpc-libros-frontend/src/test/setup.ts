import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { ANONYMOUS, useAuthStore } from '../features/auth/auth.store'
import { useAuditStore } from '../features/audit/store/audit.store'
import { useBooksStore } from '../features/books/store/books.store'
import { useCatalogStore } from '../features/books/store/catalog.store'
import { useGenresStore } from '../features/books/store/genres.store'
import { useToastStore } from '../features/notifications/toast.store'
import { requests, server } from './server'

// jsdom no implementa <dialog>.showModal/close.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}

// jsdom no implementa URL.createObjectURL.
URL.createObjectURL = vi.fn(() => 'blob:preview')
URL.revokeObjectURL = vi.fn()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

// En la app la sesión se restaura al arrancar (`restoreSession`); en las pruebas se parte sin sesión.
beforeEach(() => useAuthStore.setState(ANONYMOUS))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  for (const key of Object.keys(requests)) delete requests[key]
  useBooksStore.getState().reset()
  useGenresStore.getState().reset()
  useCatalogStore.getState().reset()
  useToastStore.setState({ toasts: [] })
  useAuditStore.getState().reset()
  useAuthStore.setState(ANONYMOUS)
})

afterAll(() => server.close())
