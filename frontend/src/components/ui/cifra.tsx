import { cn } from '@/lib/utils'
import { formatearMonto } from '@/formato'
import { useCountUp, useReducedMotion } from './bento'

/**
 * Monto del tablero en Geist Mono: el símbolo más chico y apagado, el número entero.
 * Con `animar`, cuenta hasta el valor al aparecer y al cambiar.
 */
export function Cifra({
  valor,
  animar = false,
  className,
  simboloClassName,
}: {
  valor: number
  animar?: boolean
  className?: string
  simboloClassName?: string
}) {
  const reducido = useReducedMotion()
  const mostrado = useCountUp(Math.abs(valor), animar && !reducido)
  const [simbolo, ...resto] = formatearMonto(Math.round(mostrado)).split(/\s/)
  return (
    <span className={cn('font-mono tabular-nums whitespace-nowrap', className)}>
      <span className={cn('mr-[0.15em] text-[0.55em] font-medium text-muted-foreground', simboloClassName)}>{simbolo}</span>
      {resto.join(' ')}
    </span>
  )
}
