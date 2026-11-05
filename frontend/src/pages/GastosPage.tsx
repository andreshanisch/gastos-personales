import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { EASE, Insignia, Tile, useMounted } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { etiquetaDia, formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Gasto, ResumenMensual } from '../types'

const pesos = (n: number) => formatearMonto(Math.round(n))

export function GastosPage() {
  const { anio, mes } = useMes()
  const { version, nuevoGasto, editarGasto } = useAcciones()
  const [gastos, setGastos] = useState<Gasto[] | null>(null)
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [g, r] = await Promise.all([api.gastos(anio, mes), api.resumen(anio, mes)])
      setGastos(g)
      setResumen(r)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setGastos(null)
    setResumen(null)
  }, [anio, mes])

  useEffect(() => { cargar() }, [cargar, version])

  const porDia = agruparPorDia(gastos ?? [])

  return (
    <>
      <EncabezadoPagina
        titulo="Gastos"
        subtitulo="Todo lo que gastaste en el mes, día por día."
        acciones={
          <Link to="/buscar" className="boton boton--secundario boton--chico">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Buscar y exportar
          </Link>
        }
        conMes
      />

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {!resumen && !error && <Esqueleto filas={5} />}

      {resumen && gastos && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TotalDelMes resumen={resumen} mes={mes} />
          <DatosDelMes resumen={resumen} gastos={gastos} anio={anio} mes={mes} />

          {gastos.length === 0 ? (
            <Tile titulo="Día por día" className="sm:col-span-2 lg:col-span-4">
              <p className="text-lg font-semibold tracking-tight">Todavía no hay gastos en {nombreMes(mes)}</p>
              <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
                Cargá el primero con el botón de abajo o apretando la tecla N desde cualquier pantalla.
              </p>
              <div className="mt-4">
                <button type="button" className="boton boton--primario" onClick={nuevoGasto}>Cargar un gasto</button>
              </div>
            </Tile>
          ) : (
            <Tile titulo="Día por día" className="sm:col-span-2 lg:col-span-4" accion={
              <span className="text-[12px] text-muted-foreground">Tocá un gasto para editarlo</span>
            }>
              <div className="-mx-2 flex flex-col gap-4">
                {porDia.map(([fecha, delDia]) => (
                  <section key={fecha} aria-labelledby={`dia-${fecha}`}>
                    <div className="flex items-baseline justify-between gap-3 border-b border-border px-2 pb-1.5">
                      <h3 id={`dia-${fecha}`} className="text-[13px] font-semibold text-muted-foreground">{etiquetaDia(fecha)}</h3>
                      <TotalDia gastos={delDia} />
                    </div>
                    <ul className="mt-1">
                      {delDia.map((g) => (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => editarGasto(g)}
                            aria-label={`${g.descripcion || g.categoriaNombre}, ${g.categoriaNombre}, ${montoFila(g)}. Editar`}
                            className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted" aria-hidden>
                              <span className="size-2.5 rounded-full" style={{ background: g.categoriaColor }} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium">{g.descripcion || g.categoriaNombre}</span>
                              {g.descripcion && <span className="block truncate text-[12px] text-muted-foreground">{g.categoriaNombre}</span>}
                            </span>
                            <span className="font-mono text-[15px] font-medium tabular-nums">{montoFila(g)}</span>
                            <svg className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Tile>
          )}
        </div>
      )}
    </>
  )
}

/** El total del mes en grande, cuánto queda del ingreso y en qué se fue, en una barra */
function TotalDelMes({ resumen, mes }: { resumen: ResumenMensual; mes: number }) {
  const montado = useMounted()
  const conPesos = resumen.porCategoria.filter((c) => c.totalARS > 0)
  const gastado = conPesos.reduce((s, c) => s + c.totalARS, 0)
  const ingresos = resumen.ingresosARS
  const escala = Math.max(gastado, ingresos, 1)
  const disponible = ingresos - gastado
  const porcentaje = ingresos > 0 ? Math.round((resumen.totalARS / ingresos) * 100) : null

  const anterior = resumen.totalARSMesAnterior
  const mesAnterior = nombreMes(resumen.mes === 1 ? 12 : resumen.mes - 1)
  const variacion = anterior > 0 ? Math.round(((resumen.totalARS - anterior) / anterior) * 100) : null

  const descripcion = conPesos
    .map((c) => `${c.nombre}: ${Math.round((c.totalARS / escala) * 100)}%`)
    .concat(disponible > 0 ? [`Disponible: ${Math.round((disponible / escala) * 100)}%`] : [])
    .join(', ')

  return (
    <Tile className="sm:col-span-2 lg:col-span-3" aria-labelledby="titulo-total">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div aria-live="polite" aria-atomic="true">
          <h2 id="titulo-total" className="text-[13px] font-medium text-muted-foreground">Gastaste en {nombreMes(mes)}</h2>
          <Cifra valor={resumen.totalARS} animar className="mt-1 block text-[46px] font-semibold leading-none tracking-[-0.04em] sm:text-[56px]" />
          {resumen.totalUSD > 0 && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              y <span className="font-mono text-foreground">{formatearMonto(resumen.totalUSD, 'USD')}</span>
            </p>
          )}
        </div>
        {variacion !== null ? (
          <Insignia color={variacion > 0 ? 'var(--secondary)' : 'var(--primary)'} className="font-mono">
            {variacion === 0 ? `igual que ${mesAnterior}` : `${variacion > 0 ? '+' : '−'}${Math.abs(variacion)}% vs ${mesAnterior}`}
          </Insignia>
        ) : (
          <span className="text-[12px] text-muted-foreground">Sin gastos en {mesAnterior} para comparar</span>
        )}
      </div>

      <p className="mt-3 text-[13px] text-muted-foreground">
        {ingresos === 0 ? (
          <><Link to="/ingresos" className="font-semibold text-primary hover:underline">Cargá tus ingresos del mes</Link> para ver cuánto te queda.</>
        ) : disponible >= 0 ? (
          <>Te quedan <span className="font-mono text-primary">{pesos(disponible)}</span> de tus ingresos de <span className="font-mono text-foreground">{pesos(ingresos)}</span>. Gastaste el {porcentaje}%.</>
        ) : (
          <>Te pasaste por <span className="font-mono text-secondary">{pesos(-disponible)}</span> de tus ingresos de <span className="font-mono text-foreground">{pesos(ingresos)}</span>. Gastaste el {porcentaje}%.</>
        )}
      </p>

      {/* La barra entera es el ingreso del mes (o lo gastado, si es más): cada tramo es una categoría */}
      <div className="mt-auto pt-5">
        <div className="flex h-9 gap-1" role="img" aria-label={descripcion || 'Sin gastos en pesos'}>
          {conPesos.map((c, i) => (
            <span
              key={c.categoriaId}
              title={`${c.nombre}: ${pesos(c.totalARS)}`}
              className="min-w-[4px] rounded-[8px]"
              style={{
                flexBasis: montado ? `${(c.totalARS / escala) * 100}%` : '0%',
                background: c.color,
                transition: `flex-basis 1000ms ${EASE} ${150 + i * 50}ms`,
              }}
            />
          ))}
          {disponible > 0 && (
            <span className="flex-1 rounded-[8px]" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }} title="Disponible" />
          )}
          {conPesos.length === 0 && disponible <= 0 && <span className="flex-1 rounded-[8px] bg-muted" />}
        </div>
        {conPesos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {conPesos.slice(0, 6).map((c) => (
              <li key={c.categoriaId} className="flex items-center gap-1.5 text-[12px]">
                <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.nombre}
                <span className="font-mono text-muted-foreground">{Math.round((c.totalARS / Math.max(gastado, 1)) * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tile>
  )
}

/** Cifras chicas del mes: cuántos gastos, el promedio por día y el día que más se gastó */
function DatosDelMes({ resumen, gastos, anio, mes }: { resumen: ResumenMensual; gastos: Gasto[]; anio: number; mes: number }) {
  const [anioHoy, mesHoy, diaHoy] = hoyISO().split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  const dias = anio === anioHoy && mes === mesHoy ? diaHoy : ultimo
  const porFecha = new Map<string, number>()
  for (const g of gastos) if (g.moneda === 'ARS') porFecha.set(g.fecha, (porFecha.get(g.fecha) ?? 0) + g.monto)
  const mayor = [...porFecha.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <Tile titulo="El mes en números" className="sm:col-span-2 lg:col-span-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
        <div>
          <dt className="text-[12px] text-muted-foreground">Cantidad de gastos</dt>
          <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums">{resumen.cantidadGastos}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Promedio por día</dt>
          <dd className="mt-0.5"><Cifra valor={resumen.totalARS / Math.max(dias, 1)} className="text-[20px] font-semibold tracking-[-0.02em]" /></dd>
        </div>
        <div className={cn(!mayor && 'hidden')}>
          <dt className="text-[12px] text-muted-foreground">El día que más gastaste</dt>
          {mayor && (
            <dd className="mt-0.5">
              <Cifra valor={mayor[1]} className="text-[20px] font-semibold tracking-[-0.02em]" />
              <span className="block text-[12px] text-muted-foreground">{etiquetaDia(mayor[0])}</span>
            </dd>
          )}
        </div>
      </dl>
    </Tile>
  )
}

/** Total del día en pesos (y en dólares si hay) */
function TotalDia({ gastos }: { gastos: Gasto[] }) {
  const ars = gastos.filter((g) => g.moneda === 'ARS').reduce((s, g) => s + g.monto, 0)
  const usd = gastos.filter((g) => g.moneda === 'USD').reduce((s, g) => s + g.monto, 0)
  return (
    <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
      {ars > 0 && formatearMonto(Math.round(ars))}
      {ars > 0 && usd > 0 && ' y '}
      {usd > 0 && formatearMonto(usd, 'USD')}
    </span>
  )
}

function agruparPorDia(gastos: Gasto[]): [string, Gasto[]][] {
  const mapa = new Map<string, Gasto[]>()
  for (const g of gastos) {
    const lista = mapa.get(g.fecha) ?? []
    lista.push(g)
    mapa.set(g.fecha, lista)
  }
  return [...mapa.entries()]
}

/** Pesos sin centavos, como en el resto del tablero; dólares con sus centavos */
function montoFila(g: Gasto) {
  return formatearMonto(g.moneda === 'ARS' ? Math.round(g.monto) : g.monto, g.moneda)
}
