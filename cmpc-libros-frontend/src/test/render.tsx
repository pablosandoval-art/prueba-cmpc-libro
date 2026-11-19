import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'
import { Toaster } from '../components/ui/Toaster'
import { useAuthStore } from '../features/auth/auth.store'
import { SESSION_USER } from './fixtures'

/** Inicia una sesión válida sin pasar por el login (en la app real, la cookie la mantiene el navegador). */
export function signIn() {
  useAuthStore.setState({
    status: 'authenticated',
    expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    user: SESSION_USER,
  })
}

/** Renderiza la app completa (rutas reales) en `path` y espera la carga diferida de la ruta. */
export async function renderApp(path: string, state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [
      state
        ? { pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }
        : path,
    ],
  })
  const user = userEvent.setup()
  const utils = render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  )
  await waitFor(() => expect(router.state.initialized).toBe(true))
  // RouterProvider confirma el render de la ruta en una transición: se espera a que React la aplique,
  // si no, una prueba puede buscar el contenido un instante antes de que exista.
  await act(async () => {})
  return { ...utils, router, user }
}
