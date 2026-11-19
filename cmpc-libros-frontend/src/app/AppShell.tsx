import { LogOut } from 'lucide-react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { cn } from '../components/ui/cn'
import { isSessionValid, useAuthStore } from '../features/auth/auth.store'
import { RouteFallback } from './RouteFallback'

const NAV_ITEMS = [
  { to: '/books', label: 'Catálogo' },
  { to: '/audit', label: 'Auditoría' },
] as const

/** Marco de la app autenticada: barra kraft + zona de trabajo de cartulina. */
export function AppShell() {
  const location = useLocation()
  // Cada pantalla entra con su animación; la clave cambia sólo al pasar de una a otra
  // (no al filtrar ni al abrir un libro, que se muestra en un modal sobre el catálogo).
  const section = location.pathname.startsWith('/audit') ? '/audit' : '/books'
  const checking = useAuthStore((s) => s.status === 'checking')
  const authenticated = useAuthStore((s) => isSessionValid(s))
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  // Mientras se confirma la sesión de la cookie no se decide nada (evita un salto al login).
  if (checking) return <RouteFallback />
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-kraft-deep bg-kraft">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-6 px-4 md:gap-10 md:px-8">
          <NavLink to="/books" className="type-display text-[22px] md:text-2xl">
            CMPC <span className="font-normal">LIBROS</span>
          </NavLink>
          <nav aria-label="Principal" className="flex gap-5 self-stretch md:gap-7">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'type-label flex h-full items-center border-b-[3px] text-[13px] text-ink',
                    isActive ? 'border-ink' : 'border-transparent hover:border-kraft-deep',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            {user && (
              <p className="hidden text-right leading-tight sm:block">
                <span className="block font-bold">{user.name}</span>
                <span className="text-ink">{user.email}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex h-8 items-center gap-1.5 rounded-sheet border-[1.5px] border-ink px-3 font-semibold hover:bg-ink hover:text-kraft"
            >
              <LogOut aria-hidden className="size-4" />
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-7 md:px-8">
        {/* La clave cambia sólo al pasar del listado al formulario (y viceversa): entra una vez, sin re-animar al filtrar. */}
        <div key={section} className="motion-page-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
