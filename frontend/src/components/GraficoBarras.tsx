import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EASE, useMounted } from '@/components/ui/bento'

export interface SerieGrafico {
  nombre: string
  /** Color de las barras (puede ser una variable CSS, por ejemplo var(--serie-gastos)) */
  color: string
  valores: number[]
}

interface Props {
  /** Etiqueta corta de cada grupo (eje horizontal) */
  etiquetas: string[]
  series: SerieGrafico[]
  /** Contenido del cartel al pasar el mouse por el grupo i */
  detalle: (i: number) => ReactNode
  alto?: number
  /** Descripción para lectores de pantalla */
  descripcion: string
}

const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })

const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 56 }
const ANCHO_BARRA_MAX = 24
const SEPARACION = 2 // espacio entre barras del mismo grupo

/** Gráfico de columnas agrupadas, con eje en pesos y cartel al pasar el mouse. */
export function GraficoBarras({ etiquetas, series, detalle, alto = 240, descripcion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(600)
  const [activo, setActivo] = useState<number | null>(null)
  const montado = useMounted()

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(280, entrada.contentRect.width)))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  const maximo = Math.max(0, ...series.flatMap((s) => s.valores))
  const ticks = ticksLimpios(maximo)
  const tope = ticks[ticks.length - 1] || 1

  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoPlot = alto - MARGEN.arriba - MARGEN.abajo
  const anchoGrupo = anchoPlot / Math.max(1, etiquetas.length)
  const anchoBarra = Math.min(ANCHO_BARRA_MAX, (anchoGrupo * 0.7 - SEPARACION * (series.length - 1)) / series.length)
  const anchoBarras = anchoBarra * series.length + SEPARACION * (series.length - 1)
  const y = (v: number) => MARGEN.arriba + altoPlot - (v / tope) * altoPlot

  // Si hay muchos meses y poco espacio, se muestra una etiqueta cada tanto
  const cadaCuanto = Math.ceil(etiquetas.length / Math.max(1, Math.floor(anchoPlot / 44)))

  return (
    <div className="relative w-full" ref={contenedor}>
      <svg width={ancho} height={alto} role="img" aria-label={descripcion} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line style={{ stroke: 'var(--border)' }} strokeDasharray="1 5" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(t)} y2={y(t)} />
            <text className="fill-muted-foreground font-mono text-[11px]" x={MARGEN.izquierda - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t === 0 ? '0' : compacto.format(t)}
            </text>
          </g>
        ))}

        {etiquetas.map((etiqueta, i) => {
          const x0 = MARGEN.izquierda + i * anchoGrupo + (anchoGrupo - anchoBarras) / 2
          return (
            <g key={i}>
              {activo === i && (
                <rect style={{ fill: 'color-mix(in oklch, var(--foreground) 6%, transparent)' }} x={MARGEN.izquierda + i * anchoGrupo + 2} y={MARGEN.arriba}
                  width={anchoGrupo - 4} height={altoPlot} rx={6} />
              )}
              {series.map((s, j) => {
                const v = s.valores[i] ?? 0
                if (v <= 0) return null
                const x = x0 + j * (anchoBarra + SEPARACION)
                return (
                  <path
                    key={j}
                    d={barraRedondeada(x, y(v), anchoBarra, y(0) - y(v))}
                    fill={s.color}
                    style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: montado ? 'none' : 'scaleY(0)', transition: `transform 900ms ${EASE} ${i * 30}ms` }}
                  />
                )
              })}
              {i % cadaCuanto === 0 && (
                <text className="fill-muted-foreground text-[12px]" x={MARGEN.izquierda + i * anchoGrupo + anchoGrupo / 2} y={alto - 8} textAnchor="middle">
                  {etiqueta}
                </text>
              )}
              {/* Zona sensible: todo el alto del grupo, más fácil de apuntar que la barra */}
              <rect
                x={MARGEN.izquierda + i * anchoGrupo}
                y={MARGEN.arriba}
                width={anchoGrupo}
                height={altoPlot}
                fill="transparent"
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo((a) => (a === i ? null : a))}
              />
            </g>
          )
        })}
      </svg>

      {activo !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 flex w-[200px] flex-col gap-1 rounded-lg border border-border bg-popover px-3 py-2.5 text-[13px] shadow-[0_24px_60px_-20px_oklch(0_0_0/0.75)]"
          role="status"
          style={{
            left: Math.min(ancho - 200, Math.max(0, MARGEN.izquierda + activo * anchoGrupo + anchoGrupo / 2 - 100)),
          }}
        >
          {detalle(activo)}
        </div>
      )}
    </div>
  )
}

/** Barra con las puntas de arriba redondeadas (4px) y la base recta. */
function barraRedondeada(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

/** Divisiones redondas del eje: 0, 250.000, 500.000... */
function ticksLimpios(maximo: number): number[] {
  if (maximo <= 0) return [0, 1]
  const paso0 = maximo / 4
  const potencia = 10 ** Math.floor(Math.log10(paso0))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= paso0) ?? 10 * potencia
  const ticks = []
  for (let t = 0; t <= maximo + paso * 0.001; t += paso) ticks.push(t)
  if (ticks[ticks.length - 1] < maximo) ticks.push(ticks[ticks.length - 1] + paso)
  return ticks
}
