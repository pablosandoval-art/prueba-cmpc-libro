import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="type-display text-[44px]">Página no encontrada</h1>
      <Link to="/books" className="mt-4 inline-block font-semibold underline">
        Ir al catálogo
      </Link>
    </div>
  )
}
