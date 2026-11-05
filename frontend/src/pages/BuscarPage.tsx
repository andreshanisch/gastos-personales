import { useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Tile } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { exportarExcel } from '../exportar'
import { formatearMonto, hoyISO } from '../formato'
import type { Categoria, Moneda, ResultadoBusqueda } from '../types'

interface Filtros {
  texto: string
  categoriaId: string
  desde: string
  hasta: string
  moneda: '' | Moneda
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Rangos rápidos de fechas */
function rango(nombre: 'mes' | 'mes-pasado' | 'anio' | 'todo'): Pick<Filtros, 'desde' | 'hasta'> {
  const hoy = new Date()
  switch (nombre) {
    case 'mes': return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) }
    case 'mes-pasado': return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)) }
    case 'anio': return { desde: `${hoy.getFullYear()}-01-01`, hasta: `${hoy.getFullYear()}-12-31` }
    case 'todo': return { desde: '', hasta: '' }
  }
}

const RANGOS = [
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'mes-pasado', texto: 'Mes pasado' },
  { clave: 'anio', texto: 'Este año' },
  { clave: 'todo', texto: 'Todo' },
] as const

const fechaLegible = (f: string) => f.split('-').reverse().join('/')

/** Campos de los filtros: mismo alto, borde y foco que el resto de la app */
const CAMPO = 'h-11 w-full rounded-md border-[1.5px] border-input bg-card px-3 text-[14px] text-foreground outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/45'
const ETIQUETA = 'mb-1.5 block text-[12px] font-semibold text-muted-foreground'

export function BuscarPage() {
  const { version, editarGasto } = useAcciones()
  const avisar = useAvisos()
  const [filtros, setFiltros] = useState<Filtros>({ texto: '', categoriaId: '', moneda: '', ...rango('mes') })
  const [textoDemorado, setTextoDemorado] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    api.categorias(true).then(setCategorias).catch(() => setCategorias([]))
  }, [])

  // Espera a que se termine de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setTextoDemorado(filtros.texto), 300)
    return () => clearTimeout(t)
  }, [filtros.texto])

  useEffect(() => {
    let vigente = true
    setError('')
    api.buscarGastos({
      texto: textoDemorado.trim(),
      categoriaId: filtros.categoriaId ? Number(filtros.categoriaId) : undefined,
      desde: filtros.desde,
      hasta: filtros.hasta,
      moneda: filtros.moneda,
    })
      .then((r) => { if (vigente) setResultado(r) })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [textoDemorado, filtros.categoriaId, filtros.desde, filtros.hasta, filtros.moneda, version])

  const cambiar = (cambios: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...cambios }))

  const gastos = resultado?.gastos ?? []
  const totales = new Map<Moneda, number>()
  for (const g of gastos) totales.set(g.moneda, (totales.get(g.moneda) ?? 0) + g.monto)

  const rangoActivo = RANGOS.find((r) => {
    const v = rango(r.clave)
    return v.desde === filtros.desde && v.hasta === filtros.hasta
  })?.clave

  async function exportar() {
    setExportando(true)
    setError('')
    try {
      const periodo = filtros.desde || filtros.hasta
        ? `${filtros.desde || 'inicio'}_a_${filtros.hasta || hoyISO()}`
        : 'todos'
      await exportarExcel(gastos, `gastos_${periodo}.xlsx`)
      avisar('Excel descargado')
    } catch (err) {
      setError(`No se pudo generar el Excel: ${(err as Error).message}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Buscar"
        subtitulo="Encontrá gastos de cualquier fecha y exportalos a Excel."
      />

      <div className="grid grid-cols-1 gap-3">
        {/* ---------- Filtros ---------- */}
        <Tile titulo="Filtros">
          <label className="flex h-12 items-center gap-3 rounded-full border-[1.5px] border-input bg-background px-4 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/45">
            <svg className="shrink-0 text-muted-foreground" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Buscar por texto</span>
            <input
              type="search"
              value={filtros.texto}
              onChange={(e) => cambiar({ texto: e.target.value })}
              placeholder="Buscá por descripción o categoría: coto, nafta, uber…"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <label>
              <span className={ETIQUETA}>Categoría</span>
              <select className={CAMPO} value={filtros.categoriaId} onChange={(e) => cambiar({ categoriaId: e.target.value })}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.archivada ? ' (archivada)' : ''}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={ETIQUETA}>Moneda</span>
              <select className={CAMPO} value={filtros.moneda} onChange={(e) => cambiar({ moneda: e.target.value as Filtros['moneda'] })}>
                <option value="">Todas</option>
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </select>
            </label>
            <label>
              <span className={ETIQUETA}>Desde</span>
              <input className={CAMPO} type="date" value={filtros.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
            </label>
            <label>
              <span className={ETIQUETA}>Hasta</span>
              <input className={CAMPO} type="date" value={filtros.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Rangos rápidos">
            {RANGOS.map((r) => {
              const activo = rangoActivo === r.clave
              return (
                <button
                  key={r.clave}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => cambiar(rango(r.clave))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    activo ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r.texto}
                </button>
              )
            })}
          </div>
        </Tile>

        {error && <div className="aviso !m-0" role="alert"><p>{error}</p></div>}

        {/* ---------- Cuántos y cuánto, y exportar ---------- */}
        {resultado && (
          <Tile aria-label="Resultados">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3" aria-live="polite">
                <div>
                  <span className="block text-[12px] text-muted-foreground">Gastos encontrados</span>
                  <span className="font-mono text-[30px] font-semibold leading-none tabular-nums">{gastos.length}</span>
                </div>
                {[...totales].map(([moneda, total]) => (
                  <div key={moneda}>
                    <span className="block text-[12px] text-muted-foreground">Total en {moneda === 'ARS' ? 'pesos' : 'dólares'}</span>
                    {moneda === 'ARS'
                      ? <Cifra valor={total} animar className="text-[30px] font-semibold leading-none tracking-[-0.03em]" />
                      : <span className="font-mono text-[30px] font-semibold leading-none tabular-nums">{formatearMonto(total, 'USD')}</span>}
                  </div>
                ))}
              </div>
              <button type="button" className="boton boton--primario" onClick={exportar} disabled={exportando || gastos.length === 0}>
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3v9M6 8.5l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {exportando ? 'Generando…' : 'Exportar a Excel'}
              </button>
            </div>
            {resultado.recortado && (
              <p className="mt-3 text-[12px] text-secondary">Hay más resultados de los que se muestran. Acotá la búsqueda con fechas o una categoría.</p>
            )}
          </Tile>
        )}

        {resultado && gastos.length === 0 && (
          <Tile>
            <p className="text-lg font-semibold tracking-tight">No hay gastos con esos filtros</p>
            <p className="mt-1 text-sm text-muted-foreground">Probá con otro texto o ampliá las fechas con "Todo".</p>
          </Tile>
        )}

        {/* ---------- Resultados ---------- */}
        {gastos.length > 0 && (
          <Tile titulo="Gastos" accion={<span className="text-[12px] text-muted-foreground">Tocá un gasto para editarlo</span>}>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[12px] text-muted-foreground">
                    <th scope="col" className="px-1 py-2 text-left font-medium">Fecha</th>
                    <th scope="col" className="px-1 py-2 text-left font-medium">Descripción</th>
                    <th scope="col" className="px-1 py-2 text-left font-medium">Categoría</th>
                    <th scope="col" className="px-1 py-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40" onClick={() => editarGasto(g)}>
                      <td className="whitespace-nowrap px-1 py-2 font-mono text-muted-foreground tabular-nums">{fechaLegible(g.fecha)}</td>
                      <td className="min-w-[12ch] px-1 py-2">
                        <button
                          type="button"
                          className={cn('rounded text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring', !g.descripcion && 'italic text-muted-foreground')}
                          onClick={(e) => { e.stopPropagation(); editarGasto(g) }}
                        >
                          {g.descripcion || 'Sin descripción'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-1 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: g.categoriaColor }} aria-hidden />
                          {g.categoriaNombre}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-1 py-2 text-right font-mono font-medium tabular-nums">
                        {formatearMonto(g.moneda === 'ARS' ? Math.round(g.monto) : g.monto, g.moneda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tile>
        )}
      </div>
    </>
  )
}
