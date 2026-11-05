import { cn } from '@/lib/utils'
import { formatearMonto } from '@/formato'
import { useCountUp, useReducedMotion } from './bento'

/**
 * Monto del tablero en Geist Mono: el símbolo más chico y apagado, el número entero.
 * Con `animar`, cuenta hasta el valor al aparecer y al cambiar. El lector de pantalla
 * lee solo el valor final, no cada paso de la cuenta.
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
  const contar = animar && !reducido
  const mostrado = useCountUp(Math.abs(valor), contar)
  const [simbolo, ...resto] = formatearMonto(Math.round(mostrado)).split(/\s/)
  const visible = (
    <>
      <span className={cn('mr-[0.15em] text-[0.55em] font-medium text-muted-foreground', simboloClassName)}>{simbolo}</span>
      {resto.join(' ')}
    </>
  )
  return (
    <span className={cn('font-mono tabular-nums whitespace-nowrap', className)}>
      {contar ? (
        <>
          <span className="sr-only">{formatearMonto(Math.round(Math.abs(valor)))}</span>
          <span aria-hidden>{visible}</span>
        </>
      ) : visible}
    </span>
  )
}
