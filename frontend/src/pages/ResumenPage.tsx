import { useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { EASE, Tile, useMounted } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { formatearMonto, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Gasto, ResumenMensual } from '../types'

export function ResumenPage() {
  const { anio, mes } = useMes()
  const { version, editarGasto } = useAcciones()
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setError('')
    Promise.all([api.resumen(anio, mes), api.gastos(anio, mes)])
      .then(([r, g]) => { if (vigente) { setResumen(r); setGastos(g) } })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [anio, mes, version])

  // Al cambiar de mes se limpia lo anterior y se cierran las categorías abiertas
  useEffect(() => {
    setResumen(null)
    setAbiertas(new Set())
  }, [anio, mes])

  function alternar(categoriaId: number) {
    setAbiertas((actual) => {
      const nuevas = new Set(actual)
      if (nuevas.has(categoriaId)) nuevas.delete(categoriaId)
      else nuevas.add(categoriaId)
      return nuevas
    })
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Resumen"
        subtitulo="En qué se fue la plata del mes. Tocá una categoría para ver sus gastos."
        conMes
      />

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}
      {!resumen && !error && <Esqueleto filas={5} conTitular={false} />}

      {resumen && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Numeros resumen={resumen} />

          {resumen.porCategoria.length === 0 ? (
            <Tile titulo="Por categoría" className="col-span-2 lg:col-span-3">
              <p className="text-lg font-semibold tracking-tight">Todavía no hay gastos en {nombreMes(mes)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Cuando cargues gastos, acá vas a ver cuánto se llevó cada categoría.</p>
            </Tile>
          ) : (
            <Ranking resumen={resumen} gastos={gastos} abiertas={abiertas} alAlternar={alternar} alEditar={editarGasto} />
          )}

          <MasNumeros resumen={resumen} />
        </div>
      )}
    </>
  )
}

/** Fila de cuatro cifras: ingresos, gastos, lo que queda y qué parte del ingreso se gastó */
function Numeros({ resumen }: { resumen: ResumenMensual }) {
  const montado = useMounted()
  const disponible = resumen.ingresosARS - resumen.totalARS
  const conIngresos = resumen.ingresosARS > 0
  const porcentaje = conIngresos ? Math.round((resumen.totalARS / resumen.ingresosARS) * 100) : 0
  return (
    <>
      <Tile titulo="Ingresos">
        <Cifra valor={resumen.ingresosARS} animar className="text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px]" />
      </Tile>
      <Tile titulo="Gastos">
        <Cifra valor={resumen.totalARS} animar className="text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px]" />
      </Tile>
      <Tile titulo={!conIngresos ? 'Disponible' : disponible >= 0 ? 'Disponible' : 'Te pasaste por'}>
        {conIngresos ? (
          <Cifra
            valor={disponible}
            animar
            className={cn('text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px]', disponible >= 0 ? 'text-primary' : 'text-secondary')}
          />
        ) : (
          <p className="text-[13px] text-muted-foreground">Cargá tus ingresos para ver cuánto te queda.</p>
        )}
      </Tile>
      <Tile titulo="Del ingreso, gastado">
        {conIngresos ? (
          <>
            <span className="font-mono text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px] tabular-nums">{porcentaje}%</span>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Gastaste el ${porcentaje}% de tus ingresos`}>
              <span
                className={cn('block h-full rounded-full', porcentaje > 100 ? 'bg-secondary' : 'bg-primary')}
                style={{ width: montado ? `${Math.min(100, porcentaje)}%` : 0, transition: `width 900ms ${EASE}` }}
              />
            </div>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">Sin ingresos cargados.</p>
        )}
      </Tile>
    </>
  )
}

/** Categorías de mayor a menor, con su barra; cada una se abre para ver sus gastos */
function Ranking({ resumen, gastos, abiertas, alAlternar, alEditar }: {
  resumen: ResumenMensual
  gastos: Gasto[]
  abiertas: Set<number>
  alAlternar: (id: number) => void
  alEditar: (g: Gasto) => void
}) {
  const montado = useMounted()
  const maximo = Math.max(0, ...resumen.porCategoria.map((c) => c.totalARS))
  // Con ingresos cargados, el porcentaje es sobre lo que ingresó; si no, sobre lo gastado
  const base = resumen.ingresosARS > 0 ? resumen.ingresosARS : resumen.totalARS

  return (
    <Tile titulo="Por categoría" className="col-span-2 lg:col-span-3" accion={<span className="text-[12px] text-muted-foreground">De mayor a menor</span>}>
      <ul className="-mx-2 flex flex-col gap-1">
        {resumen.porCategoria.map((c, i) => {
          const porcentaje = base > 0 ? Math.round((c.totalARS / base) * 100) : 0
          const textoPorcentaje = porcentaje === 0 && c.totalARS > 0 ? 'menos del 1%' : `${porcentaje}%`
          const soloDolares = c.totalARS === 0 && c.totalUSD > 0
          const abierta = abiertas.has(c.categoriaId)
          const idDetalle = `categoria-${c.categoriaId}-gastos`
          return (
            <li key={c.categoriaId}>
              <button
                type="button"
                aria-expanded={abierta}
                aria-controls={idDetalle}
                onClick={() => alAlternar(c.categoriaId)}
                className="block w-full rounded-2xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium">
                    <svg
                      className={cn('shrink-0 text-muted-foreground transition-transform duration-150', abierta && 'rotate-90')}
                      width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"
                    >
                      <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="truncate">{c.nombre}</span>
                  </span>
                  <span className="font-mono text-[17px] font-semibold tabular-nums">
                    {soloDolares ? formatearMonto(c.totalUSD, 'USD') : formatearMonto(Math.round(c.totalARS))}
                  </span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className="block h-full min-w-[4px] rounded-full"
                    style={{
                      width: montado ? `${maximo ? (c.totalARS / maximo) * 100 : 0}%` : 0,
                      background: c.color,
                      transition: `width 900ms ${EASE} ${i * 40}ms`,
                    }}
                  />
                </span>
                <span className="mt-1.5 block text-[12px] text-muted-foreground">
                  {soloDolares ? 'En dólares' : `${textoPorcentaje} ${resumen.ingresosARS > 0 ? 'de tus ingresos' : 'del mes'}`}, {c.cantidad} {c.cantidad === 1 ? 'gasto' : 'gastos'}
                  {c.totalUSD > 0 && !soloDolares && ` y ${formatearMonto(c.totalUSD, 'USD')}`}
                </span>
              </button>
              {abierta && (
                <ul id={idDetalle} className="mb-2 ml-8 mr-2 border-l-2 border-border pl-2">
                  {gastosDeCategoria(gastos, c.categoriaId).map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => alEditar(g)}
                        aria-label={`${g.descripcion || 'Sin descripción'}, ${formatearMonto(g.monto, g.moneda)}. Editar`}
                        className="grid w-full grid-cols-[4.5em_minmax(0,1fr)_auto] items-baseline gap-3 rounded-xl px-2 py-1.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-[12px] text-muted-foreground">{fechaCorta(g.fecha)}</span>
                        <span className={cn('truncate text-[13px]', !g.descripcion && 'italic text-muted-foreground')}>
                          {g.descripcion || 'Sin descripción'}
                        </span>
                        <span className="font-mono text-[13px] font-medium tabular-nums">
                          {formatearMonto(g.moneda === 'ARS' ? Math.round(g.monto) : g.monto, g.moneda)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </Tile>
  )
}

/** Comparación con el mes anterior, cantidad de gastos y lo que hubo en dólares */
function MasNumeros({ resumen }: { resumen: ResumenMensual }) {
  const mesAnterior = nombreMes(resumen.mes === 1 ? 12 : resumen.mes - 1)
  const anterior = resumen.totalARSMesAnterior
  const variacion = anterior > 0 ? Math.round(((resumen.totalARS - anterior) / anterior) * 100) : null
  return (
    <Tile titulo="Más números" className="col-span-2 lg:col-span-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
        <div>
          <dt className="text-[12px] text-muted-foreground">Gastos de {mesAnterior}</dt>
          <dd className="mt-0.5">
            <Cifra valor={anterior} className="text-[20px] font-semibold tracking-[-0.02em]" />
            {variacion !== null && (
              <span className={cn('block font-mono text-[12px]', variacion > 0 ? 'text-secondary' : 'text-primary')}>
                {variacion === 0 ? 'igual que este mes' : `este mes ${variacion > 0 ? '+' : '−'}${Math.abs(variacion)}%`}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Cantidad de gastos</dt>
          <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums">{resumen.cantidadGastos}</dd>
        </div>
        {resumen.ingresosUSD > 0 && (
          <div>
            <dt className="text-[12px] text-muted-foreground">Ingresos en dólares</dt>
            <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums">{formatearMonto(resumen.ingresosUSD, 'USD')}</dd>
          </div>
        )}
        {resumen.totalUSD > 0 && (
          <div>
            <dt className="text-[12px] text-muted-foreground">Gastos en dólares</dt>
            <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums">{formatearMonto(resumen.totalUSD, 'USD')}</dd>
          </div>
        )}
      </dl>
    </Tile>
  )
}

/** Gastos de una categoría de mayor a menor: primero los de pesos, después los de dólares. */
function gastosDeCategoria(gastos: Gasto[], categoriaId: number) {
  return gastos
    .filter((g) => g.categoriaId === categoriaId)
    .sort((a, b) => (a.moneda === b.moneda ? b.monto - a.monto : a.moneda === 'ARS' ? -1 : 1))
}

/** "3 nov." a partir de yyyy-MM-dd */
function fechaCorta(fechaISO: string) {
  const [a, m, d] = fechaISO.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
