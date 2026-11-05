import { useCallback, useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { EASE, Insignia, Tile, useMounted } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { etiquetaDia, formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Ingreso } from '../types'

export function IngresosPage() {
  const { anio, mes } = useMes()
  const { version, nuevoIngreso, editarIngreso, refrescar } = useAcciones()
  const avisar = useAvisos()
  const [ingresos, setIngresos] = useState<Ingreso[] | null>(null)
  const [error, setError] = useState('')
  const [copiando, setCopiando] = useState(false)

  const cargar = useCallback(async () => {
    setError('')
    try {
      setIngresos(await api.ingresos(anio, mes))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => { setIngresos(null) }, [anio, mes])
  useEffect(() => { cargar() }, [cargar, version])

  async function copiarMesAnterior() {
    setCopiando(true)
    setError('')
    try {
      const copiados = await api.copiarIngresosMesAnterior(anio, mes)
      avisar(copiados.length === 1 ? 'Se copió 1 ingreso' : `Se copiaron ${copiados.length} ingresos`)
      refrescar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCopiando(false)
    }
  }

  const hoy = hoyISO()
  const enPesos = ingresos?.filter((i) => i.moneda === 'ARS') ?? []
  const totalARS = enPesos.reduce((s, i) => s + i.monto, 0)
  const totalUSD = ingresos?.filter((i) => i.moneda === 'USD').reduce((s, i) => s + i.monto, 0) ?? 0
  const cobradoARS = enPesos.filter((i) => i.fecha <= hoy).reduce((s, i) => s + i.monto, 0)
  const porCobrar = ingresos?.filter((i) => i.fecha > hoy) ?? []
  const mesAnterior = nombreMes(mes === 1 ? 12 : mes - 1)

  return (
    <>
      <EncabezadoPagina
        titulo="Ingresos"
        subtitulo="Lo que cobrás en el mes. El plan lo reparte desde la fecha en que entra."
        conMes
      />

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {ingresos === null && !error && <Esqueleto filas={3} />}

      {ingresos?.length === 0 && (
        <Tile titulo="Primer paso">
          <p className="text-lg font-semibold tracking-tight">Todavía no hay ingresos en {nombreMes(mes)}</p>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            Cargá tu sueldo y cualquier otro ingreso con la fecha en que lo cobrás. Si se repiten todos los meses,
            podés traer los de {mesAnterior} con un clic.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="boton boton--primario" onClick={nuevoIngreso}>Cargar un ingreso</button>
            <button type="button" className="boton boton--secundario" onClick={copiarMesAnterior} disabled={copiando}>
              {copiando ? 'Copiando…' : `Copiar los de ${mesAnterior}`}
            </button>
          </div>
        </Tile>
      )}

      {ingresos && ingresos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* ---------- Total del mes y en qué días entra ---------- */}
          <Tile className="sm:col-span-2 lg:col-span-3" aria-labelledby="titulo-ingresos">
            <div aria-live="polite" aria-atomic="true">
              <h2 id="titulo-ingresos" className="text-[13px] font-medium text-muted-foreground">Ingresos de {nombreMes(mes)}</h2>
              <Cifra valor={totalARS} animar className="mt-1 block text-[46px] font-semibold leading-none tracking-[-0.04em] sm:text-[56px]" />
              {totalUSD > 0 && (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  y <span className="font-mono text-foreground">{formatearMonto(totalUSD, 'USD')}</span>
                </p>
              )}
            </div>
            <CalendarioIngresos anio={anio} mes={mes} ingresos={enPesos} hoy={hoy} />
          </Tile>

          {/* ---------- Cobrado y por cobrar ---------- */}
          <Tile titulo="Cobrado y por cobrar" className="sm:col-span-2 lg:col-span-1">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
              <div>
                <dt className="text-[12px] text-muted-foreground">Cobrado hasta hoy</dt>
                <dd className="mt-0.5"><Cifra valor={cobradoARS} className="text-[20px] font-semibold tracking-[-0.02em] text-primary" /></dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-foreground">Por cobrar</dt>
                <dd className="mt-0.5"><Cifra valor={totalARS - cobradoARS} className="text-[20px] font-semibold tracking-[-0.02em]" /></dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-foreground">Cantidad de ingresos</dt>
                <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums">{ingresos.length}</dd>
              </div>
            </dl>
            {porCobrar.length > 0 && (
              <p className="mt-auto pt-4 text-[12px] text-muted-foreground">
                {porCobrar.length === 1 ? '1 ingreso todavía no se cobró' : `${porCobrar.length} ingresos todavía no se cobraron`}: el plan lo cuenta desde su fecha.
              </p>
            )}
          </Tile>

          {/* ---------- Detalle ---------- */}
          <Tile
            titulo="Detalle"
            className="sm:col-span-2 lg:col-span-4"
            accion={<button type="button" className="text-[12px] font-semibold text-primary hover:underline" onClick={nuevoIngreso}>Agregar otro</button>}
          >
            <ul className="-mx-2 -my-1">
              {ingresos.map((i) => {
                const pendiente = i.fecha > hoy
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => editarIngreso(i)}
                      aria-label={`${i.descripcion}, ${formatearMonto(i.monto, i.moneda)}${pendiente ? ', por cobrar' : ''}. Editar`}
                      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-primary" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 17.5V5M6 10l5-5 5 5" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{i.descripcion}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{etiquetaDia(i.fecha)}</span>
                      </span>
                      {pendiente && <Insignia color="var(--muted-foreground)">Por cobrar</Insignia>}
                      <span className={cn('font-mono text-[15px] font-medium tabular-nums', !pendiente && 'text-primary')}>
                        {formatearMonto(i.moneda === 'ARS' ? Math.round(i.monto) : i.monto, i.moneda)}
                      </span>
                      <svg className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Tile>
        </div>
      )}
    </>
  )
}

/**
 * Los días del mes en fila, con una barra el día que entra cada ingreso (alto según el monto):
 * lima si ya se cobró, solo contorno si todavía no. Muestra desde cuándo el plan cuenta cada uno.
 */
function CalendarioIngresos({ anio, mes, ingresos, hoy }: { anio: number; mes: number; ingresos: Ingreso[]; hoy: string }) {
  const montado = useMounted()
  const ultimo = new Date(anio, mes, 0).getDate()
  const porDia = Array.from({ length: ultimo + 1 }, () => 0)
  for (const i of ingresos) porDia[Number(i.fecha.slice(8, 10))] += i.monto
  const maximo = Math.max(...porDia, 1)
  const [anioHoy, mesHoy, diaHoy] = hoy.split('-').map(Number)
  const esEsteMes = anio === anioHoy && mes === mesHoy
  const cobrado = (d: number) => anio * 10000 + mes * 100 + d <= anioHoy * 10000 + mesHoy * 100 + diaHoy
  const descripcion = porDia
    .map((m, d) => (m > 0 ? `${d} de ${nombreMes(mes)}: ${formatearMonto(Math.round(m))}${cobrado(d) ? '' : ', por cobrar'}` : ''))
    .filter(Boolean)
    .join('; ')

  return (
    <div className="mt-auto pt-6">
      <div className="flex h-20 items-end gap-[3px]" role="img" aria-label={`Ingresos por día: ${descripcion}`}>
        {Array.from({ length: ultimo }, (_, i) => i + 1).map((d, i) => {
          const m = porDia[d]
          const yaEntro = cobrado(d)
          return (
            <span
              key={d}
              className={cn('flex-1 rounded-[4px]', esEsteMes && d === diaHoy && 'ring-1 ring-foreground/60')}
              style={{
                height: montado ? (m > 0 ? `${Math.max(12, (m / maximo) * 100)}%` : '6%') : '6%',
                background: m > 0 && yaEntro ? 'var(--primary)' : m > 0 ? 'transparent' : 'var(--muted)',
                boxShadow: m > 0 && !yaEntro ? 'inset 0 0 0 1.5px var(--primary)' : undefined,
                transition: `height 900ms ${EASE} ${i * 14}ms`,
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
        <span className="font-mono">1</span>
        <span>Día en que entra cada ingreso · contorno: todavía no se cobró</span>
        <span className="font-mono">{ultimo}</span>
      </div>
    </div>
  )
}
