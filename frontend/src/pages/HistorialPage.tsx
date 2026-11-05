import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { GraficoBarras } from '../components/GraficoBarras'
import { Pills, Tile } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { capitalizar, formatearMonto, nombreMes } from '../formato'
import { alTeclaEnGrupo } from '../teclado'
import type { Historial } from '../types'

const RANGOS = [6, 12, 24] as const
type Rango = (typeof RANGOS)[number]

const pesos = (n: number) => formatearMonto(Math.round(n))
const mesCorto = (mes: number) => capitalizar(nombreMes(mes).slice(0, 3))
const INGRESOS = 'var(--chart-1)'
const GASTOS = 'var(--chart-2)'

export function HistorialPage() {
  const [rango, setRango] = useState<Rango>(12)
  const [historial, setHistorial] = useState<Historial | null>(null)
  const [error, setError] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    setError('')
    api.historial(rango)
      .then((h) => { if (vigente) setHistorial(h) })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [rango])

  // Categorías con gastos en el período, de la que más gastó a la que menos
  const categoriasConGastos = useMemo(() => {
    if (!historial) return []
    const totales = new Map<number, number>()
    for (const m of historial.meses) for (const c of m.porCategoria) totales.set(c.categoriaId, (totales.get(c.categoriaId) ?? 0) + c.total)
    return historial.categorias
      .filter((c) => (totales.get(c.id) ?? 0) > 0)
      .sort((a, b) => (totales.get(b.id) ?? 0) - (totales.get(a.id) ?? 0))
  }, [historial])

  const elegida = categoriasConGastos.find((c) => c.id === categoriaId) ?? categoriasConGastos[0] ?? null

  const encabezado = (
    <EncabezadoPagina
      titulo="Historial"
      subtitulo="Cómo vienen tus ingresos y gastos, mes a mes."
      acciones={
        <Pills
          etiqueta="Período"
          valor={rango}
          opciones={RANGOS.map((r) => ({ valor: r, texto: `${r} meses` }))}
          alCambiar={setRango}
        />
      }
    />
  )

  if (error) return <>{encabezado}<div className="aviso" role="alert"><p>{error}</p></div></>
  if (!historial) return <>{encabezado}<Esqueleto filas={4} conTitular={false} /></>

  const meses = historial.meses
  const cruzaAnios = meses.length > 0 && meses[0].anio !== meses[meses.length - 1].anio
  const etiquetas = meses.map((m) => mesCorto(m.mes) + (cruzaAnios && (m.mes === 1 || m === meses[0]) ? ` ${String(m.anio).slice(2)}` : ''))
  const conMovimientos = meses.filter((m) => m.ingresosARS > 0 || m.gastosARS > 0)
  const totalIngresos = meses.reduce((s, m) => s + m.ingresosARS, 0)
  const totalGastos = meses.reduce((s, m) => s + m.gastosARS, 0)
  const diferencia = totalIngresos - totalGastos
  const promedioGastos = conMovimientos.length ? totalGastos / conMovimientos.length : 0
  const mayor = meses.reduce((a, b) => (b.gastosARS > a.gastosARS ? b : a), meses[0])
  const nombreLargo = (m: { anio: number; mes: number }) => `${capitalizar(nombreMes(m.mes))} ${m.anio}`

  const valoresCategoria = elegida
    ? meses.map((m) => m.porCategoria.find((c) => c.categoriaId === elegida.id)?.total ?? 0)
    : []

  if (conMovimientos.length === 0) {
    return (
      <>
        {encabezado}
        <Tile titulo="Historial">
          <p className="text-lg font-semibold tracking-tight">Todavía no hay movimientos</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando cargues ingresos y gastos, acá vas a ver cómo evolucionan en los últimos {rango} meses.</p>
        </Tile>
      </>
    )
  }

  const cifra = 'text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px]'

  return (
    <>
      {encabezado}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile titulo="Promedio de gastos por mes">
          <Cifra valor={promedioGastos} animar className={cifra} />
        </Tile>
        <Tile titulo={diferencia >= 0 ? 'Te sobró en el período' : 'Te faltó en el período'}>
          <Cifra valor={diferencia} animar className={cn(cifra, diferencia >= 0 ? 'text-primary' : 'text-secondary')} />
          <p className="mt-2 text-[12px] text-muted-foreground">Ingresos menos gastos de {rango} meses.</p>
        </Tile>
        <Tile titulo="Mes con más gastos">
          <Cifra valor={mayor.gastosARS} className={cifra} />
          <p className="mt-2 text-[12px] text-muted-foreground">{nombreLargo(mayor)}</p>
        </Tile>
        <Tile titulo="Meses con movimientos">
          <span className={cn('font-mono tabular-nums', cifra)}>{conMovimientos.length}</span>
          <p className="mt-2 text-[12px] text-muted-foreground">de los últimos {rango}.</p>
        </Tile>

        <Tile
          titulo="Ingresos y gastos por mes"
          className="col-span-2 lg:col-span-4"
          accion={
            <ul className="flex gap-4 text-[12px] text-muted-foreground" aria-label="Referencias">
              <li className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: INGRESOS }} aria-hidden />Ingresos</li>
              <li className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: GASTOS }} aria-hidden />Gastos</li>
            </ul>
          }
        >
          <GraficoBarras
            etiquetas={etiquetas}
            series={[
              { nombre: 'Ingresos', color: INGRESOS, valores: meses.map((m) => m.ingresosARS) },
              { nombre: 'Gastos', color: GASTOS, valores: meses.map((m) => m.gastosARS) },
            ]}
            descripcion={`Ingresos y gastos en pesos de los últimos ${rango} meses. Los valores están en la tabla de abajo.`}
            detalle={(i) => {
              const m = meses[i]
              const saldo = m.ingresosARS - m.gastosARS
              return (
                <>
                  <strong className="font-semibold">{nombreLargo(m)}</strong>
                  <FilaCartel color={INGRESOS} nombre="Ingresos" valor={pesos(m.ingresosARS)} />
                  <FilaCartel color={GASTOS} nombre="Gastos" valor={pesos(m.gastosARS)} />
                  <FilaCartel nombre={saldo >= 0 ? 'Sobró' : 'Faltó'} valor={pesos(Math.abs(saldo))} />
                </>
              )
            }}
          />
        </Tile>

        {elegida && (
          <Tile titulo="Evolución de una categoría" className="col-span-2 lg:col-span-4">
            <div role="radiogroup" aria-label="Categoría" onKeyDown={alTeclaEnGrupo} className="mb-4 flex flex-wrap gap-2">
              {categoriasConGastos.map((c) => {
                const activa = c.id === elegida.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    tabIndex={activa ? 0 : -1}
                    onClick={() => setCategoriaId(c.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      activa ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                    {c.nombre}
                  </button>
                )
              })}
            </div>
            <GraficoBarras
              alto={200}
              etiquetas={etiquetas}
              series={[{ nombre: elegida.nombre, color: elegida.color, valores: valoresCategoria }]}
              descripcion={`Gastos en ${elegida.nombre} por mes, en pesos.`}
              detalle={(i) => (
                <>
                  <strong className="font-semibold">{nombreLargo(meses[i])}</strong>
                  <FilaCartel color={elegida.color} nombre={elegida.nombre} valor={pesos(valoresCategoria[i])} />
                </>
              )}
            />
          </Tile>
        )}

        <Tile titulo="Mes por mes" className="col-span-2 lg:col-span-4">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-[12px] text-muted-foreground">
                  <th scope="col" className="px-1 py-2 text-left font-medium">Mes</th>
                  <th scope="col" className="px-1 py-2 text-right font-medium">Ingresos</th>
                  <th scope="col" className="px-1 py-2 text-right font-medium">Gastos</th>
                  <th scope="col" className="px-1 py-2 text-right font-medium">Diferencia</th>
                  <th scope="col" className="px-1 py-2 text-right font-medium">Gastado</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {[...meses].reverse().map((m) => {
                  const saldo = m.ingresosARS - m.gastosARS
                  return (
                    <tr key={`${m.anio}-${m.mes}`} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <th scope="row" className="whitespace-nowrap px-1 py-2 text-left font-sans font-medium">{nombreLargo(m)}</th>
                      <td className="whitespace-nowrap px-1 py-2 text-right">{pesos(m.ingresosARS)}</td>
                      <td className="whitespace-nowrap px-1 py-2 text-right">{pesos(m.gastosARS)}</td>
                      <td className={cn('whitespace-nowrap px-1 py-2 text-right', saldo < 0 ? 'text-secondary' : saldo > 0 && 'text-primary')}>
                        {saldo < 0 ? '−' : ''}{pesos(Math.abs(saldo))}
                      </td>
                      <td className="whitespace-nowrap px-1 py-2 text-right text-muted-foreground">
                        {m.ingresosARS > 0 ? `${Math.round((m.gastosARS / m.ingresosARS) * 100)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">Solo montos en pesos.</p>
        </Tile>
      </div>
    </>
  )
}

function FilaCartel({ color, nombre, valor }: { color?: string; nombre: ReactNode; valor: string }) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      {color && <i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />}
      {nombre}
      <b className="ml-auto font-mono font-semibold tabular-nums text-foreground">{valor}</b>
    </span>
  )
}
