import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'status' : undefined}
      className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
    />
  )
}
