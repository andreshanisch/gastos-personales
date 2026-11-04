import { useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Monto } from '../components/Monto'
import { exportarExcel } from '../exportar'
import { hoyISO } from '../formato'
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

      <div className="panel filtros">
        <label className="filtros__texto buscador">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
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
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Categoría</span>
          <select value={filtros.categoriaId} onChange={(e) => cambiar({ categoriaId: e.target.value })}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}{c.archivada ? ' (archivada)' : ''}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Moneda</span>
          <select value={filtros.moneda} onChange={(e) => cambiar({ moneda: e.target.value as Filtros['moneda'] })}>
            <option value="">Todas</option>
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Desde</span>
          <input type="date" value={filtros.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Hasta</span>
          <input type="date" value={filtros.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} />
        </label>

        <div className="filtros__rangos" role="group" aria-label="Rangos rápidos">
          {RANGOS.map((r) => (
            <button
              key={r.clave}
              type="button"
              className={`chip chip--boton ${rangoActivo === r.clave ? 'chip--activo' : ''}`}
              aria-pressed={rangoActivo === r.clave}
              onClick={() => cambiar(rango(r.clave))}
            >
              {r.texto}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}

      {resultado && (
        <div className="resultados">
          <p className="resultados__cantidad" aria-live="polite">
            <strong>{gastos.length}</strong> {gastos.length === 1 ? 'gasto' : 'gastos'}
            {[...totales].map(([moneda, total]) => (
              <Monto key={moneda} valor={total} moneda={moneda} className="resultados__total" />
            ))}
          </p>
          <button type="button" className="boton boton--primario" onClick={exportar} disabled={exportando || gastos.length === 0}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3v9M6 8.5l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {exportando ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>
      )}

      {resultado?.recortado && (
        <p className="aviso aviso--suave">Hay más resultados de los que se muestran. Acotá la búsqueda con fechas o una categoría.</p>
      )}

      {resultado && gastos.length === 0 && (
        <div className="vacio">
          <h2 className="vacio__titulo">No hay gastos con esos filtros</h2>
          <p className="vacio__texto">Probá con otro texto o ampliá las fechas con "Todo".</p>
        </div>
      )}

      {gastos.length > 0 && (
        <div className="panel tabla-contenedor">
          <table className="tabla tabla--resultados">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Descripción</th>
                <th scope="col">Categoría</th>
                <th scope="col" className="tabla__numero">Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="tabla__fila-clic" onClick={() => editarGasto(g)} title="Editar gasto">
                  <td className="tabla__suave">{fechaLegible(g.fecha)}</td>
                  <td className={`tabla__descripcion ${g.descripcion ? '' : 'tabla__suave'}`}>
                    <button type="button" className="tabla__enlace" onClick={(e) => { e.stopPropagation(); editarGasto(g) }}>
                      {g.descripcion || 'Sin descripción'}
                    </button>
                  </td>
                  <td>
                    <span className="tabla__categoria">
                      <span className="fila__punto" style={{ background: g.categoriaColor }} aria-hidden="true" />
                      {g.categoriaNombre}
                    </span>
                  </td>
                  <td className="tabla__numero"><Monto valor={g.monto} moneda={g.moneda} className="tabla__monto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
