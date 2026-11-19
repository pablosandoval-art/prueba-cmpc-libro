import { Spinner } from '../components/ui/Spinner'

export function RouteFallback() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Spinner className="size-6" label="Cargando" />
    </div>
  )
}
