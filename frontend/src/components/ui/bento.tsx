import * as React from 'react'
import { cn } from '@/lib/utils'
import { alTeclaEnGrupo } from '@/teclado'

/*
 * Piezas del tablero de bloques ("bento"): el bloque con esquinas grandes, el selector
 * de píldoras y los hooks de animación. Adaptadas del componente de referencia que pasó
 * Andres (Web3Bento), sin su contenido de criptomonedas.
 */

/** Curva de salida de todas las animaciones del tablero */
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function useReducedMotion() {
  const [reducido, setReducido] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const actualizar = () => setReducido(mq.matches)
    actualizar()
    mq.addEventListener('change', actualizar)
    return () => mq.removeEventListener('change', actualizar)
  }, [])
  return reducido
}

/** true un cuadro después de montar: sirve para animar desde el estado inicial */
export function useMounted() {
  const [montado, setMontado] = React.useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return montado
}

/** Cuenta desde el valor anterior hasta `objetivo` con una curva de salida */
export function useCountUp(objetivo: number, activo: boolean, duracion = 1100) {
  const [valor, setValor] = React.useState(activo ? 0 : objetivo)
  const desde = React.useRef(activo ? 0 : objetivo)
  React.useEffect(() => {
    if (!activo) {
      desde.current = objetivo
      setValor(objetivo)
      return
    }
    const inicio = desde.current
    let raf = 0
    const t0 = performance.now()
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - t0) / duracion)
      const v = inicio + (objetivo - inicio) * (1 - Math.pow(1 - p, 4))
      setValor(v)
      desde.current = v
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [objetivo, activo, duracion])
  return valor
}

/** Bloque del tablero: superficie de tarjeta, esquinas de 26px, título chico arriba */
export function Tile({
  titulo,
  accion,
  className,
  children,
  ...resto
}: {
  titulo?: React.ReactNode
  accion?: React.ReactNode
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  const idTitulo = React.useId()
  return (
    <section
      aria-labelledby={titulo ? idTitulo : undefined}
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-tile border border-border bg-card p-5 text-card-foreground',
        className,
      )}
      {...resto}
    >
      {(titulo || accion) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 id={idTitulo} className="text-[13px] font-medium text-muted-foreground">{titulo}</h2>}
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

/** Selector de píldoras: una opción elegida, con flechas como un grupo de radios */
export function Pills<T extends string | number>({
  valor,
  opciones,
  alCambiar,
  etiqueta,
  className,
}: {
  valor: T
  opciones: { valor: T; texto: React.ReactNode }[]
  alCambiar: (v: T) => void
  etiqueta: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      onKeyDown={alTeclaEnGrupo}
      className={cn('inline-flex flex-wrap rounded-full border border-border p-0.5', className)}
    >
      {opciones.map((o) => {
        const elegida = o.valor === valor
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={elegida}
            tabIndex={elegida ? 0 : -1}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              elegida ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}

/** Etiqueta en píldora con un tinte del color dado */
export function Insignia({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', className)}
      style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
    >
      {children}
    </span>
  )
}
