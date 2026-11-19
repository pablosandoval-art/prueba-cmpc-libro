import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { NotFound } from './NotFound'
import { RouteFallback } from './RouteFallback'

/**
 * Cada pantalla se carga bajo demanda (code-splitting): el listado no
 * descarga el formulario ni sus dependencias de validación hasta usarlo.
 */
export const routes: RouteObject[] = [
  {
    path: '/login',
    hydrateFallbackElement: <RouteFallback />,
    lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }),
  },
  {
    path: '/',
    element: <AppShell />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { index: true, element: <Navigate to="/books" replace /> },
      {
        path: 'books',
        lazy: async () => ({ Component: (await import('../features/books/pages/BooksPage')).BooksPage }),
        // Detalle, edición y creación se abren como modal sobre el catálogo, con el mismo componente:
        // así pasar del detalle a editarlo (y volver) no cierra el modal.
        children: ['new', ':id', ':id/edit'].map((path) => ({
          path,
          lazy: async () => ({ Component: (await import('../features/books/components/BookModal')).BookModal }),
        })),
      },
      {
        path: 'audit',
        lazy: async () => ({ Component: (await import('../features/audit/pages/AuditPage')).AuditPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
