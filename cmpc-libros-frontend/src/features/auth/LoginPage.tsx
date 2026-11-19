import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { RouteFallback } from '../../app/RouteFallback'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { isSessionValid, useAuthStore } from './auth.store'

const loginSchema = z.object({
  email: z.email({ error: 'Ingresa un email válido' }),
  password: z.string().min(1, { error: 'Ingresa tu contraseña' }),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const expired = useAuthStore((s) => s.expired)
  const authenticated = useAuthStore((s) => isSessionValid(s))
  const checking = useAuthStore((s) => s.status === 'checking')
  const lockedUntil = useAuthStore((s) => s.lockedUntil)
  const lockSeconds = useAuthStore((s) => s.lockSeconds)
  const clearLock = useAuthStore((s) => s.clearLock)
  const remaining = useLockCountdown(lockedUntil, lockSeconds, clearLock)
  const from = (location.state as { from?: string } | null)?.from ?? '/books'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' })

  if (checking) return <RouteFallback />
  if (authenticated) return <Navigate to={from} replace />

  async function onSubmit(values: LoginValues) {
    if (await login(values.email.trim(), values.password)) navigate(from, { replace: true })
  }

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-none">
      <div className="flex h-[60px] items-center border-b border-kraft-deep bg-kraft px-4 md:h-auto md:flex-col md:items-stretch md:justify-between md:border-b-0 md:px-12 md:py-12">
        <p className="type-display text-[22px] md:text-2xl">
          CMPC <span className="font-normal">LIBROS</span>
        </p>
        <p className="type-display mt-10 hidden max-w-md text-[64px] leading-[0.92] text-balance md:block">
          El catálogo de libros, a mano.
        </p>
        <p className="hidden text-sm font-medium text-ink md:block">Acceso exclusivo para personal de CMPC.</p>
      </div>
      <main className="flex items-start justify-center bg-board px-4 pt-8 pb-10 md:items-center md:py-10">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm rounded-sheet border border-rule bg-sheet p-6 md:p-8"
        >
          <h1 className="type-display text-[36px]">Iniciar sesión</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">Ingresa con tu cuenta corporativa.</p>

          {(error || expired) && (
            <p
              role="alert"
              className={
                error
                  ? 'mt-5 border-[1.5px] border-alert bg-alert-pale px-3 py-2.5 text-sm font-medium text-alert'
                  : 'mt-5 die-line px-3 py-2.5 text-sm font-medium'
              }
            >
              {remaining > 0
                ? `Demasiados intentos fallidos. Podrás intentarlo de nuevo en ${remaining} s.`
                : (error ?? 'Tu sesión expiró. Vuelve a iniciar sesión.')}
            </p>
          )}

          <div className="mt-5 grid gap-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="nombre@cmpc.cl"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={remaining > 0}
            icon={<LogIn aria-hidden className="size-4" />}
            className="mt-6 w-full"
          >
            {loading ? 'Ingresando…' : remaining > 0 ? `Espera ${remaining} s` : 'Ingresar'}
          </Button>
        </form>
      </main>
    </div>
  )
}

/**
 * Cuenta atrás del bloqueo de login (segundos restantes, 0 = libre). Al terminar
 * limpia el bloqueo y su mensaje, y el formulario vuelve a estar disponible.
 */
function useLockCountdown(lockedUntil: number | null, lockSeconds: number, onEnd: () => void): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!lockedUntil) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= lockedUntil) onEnd()
    }, 250)
    return () => clearInterval(timer)
  }, [lockedUntil, onEnd])
  if (!lockedUntil) return 0
  return Math.max(0, Math.min(lockSeconds, Math.ceil((lockedUntil - now) / 1000)))
}
