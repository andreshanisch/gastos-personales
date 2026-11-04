import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
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

export function BuscarPage() {
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
  }, [textoDemorado, filtros.categoriaId, filtros.desde, filtros.hasta, filtros.moneda])

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
    } catch (err) {
      setError(`No se pudo generar el Excel: ${(err as Error).message}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <div className="encabezado-pagina">
        <h1>Buscar gastos</h1>
        <Link to="/gastos" className="boton-texto">Volver a gastos</Link>
      </div>

      <div className="filtros">
        <label className="campo filtros__texto">
          <span className="campo__etiqueta">Texto</span>
          <input
            type="search"
            value={filtros.texto}
            onChange={(e) => cambiar({ texto: e.target.value })}
            placeholder="Descripción o categoría, por ejemplo: coto, nafta, uber"
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
        <div className="resultados__resumen">
          <p aria-live="polite">
            <strong>{gastos.length}</strong> {gastos.length === 1 ? 'gasto' : 'gastos'}
            {[...totales].map(([moneda, total]) => (
              <span key={moneda} className="resultados__total">{formatearMonto(total, moneda)}</span>
            ))}
          </p>
          <button type="button" className="boton boton--primario" onClick={exportar} disabled={exportando || gastos.length === 0}>
            {exportando ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>
      )}

      {resultado?.recortado && (
        <p className="aviso aviso--suave">Hay más resultados de los que se muestran. Acotá la búsqueda con fechas o una categoría.</p>
      )}

      {resultado && gastos.length === 0 && <p className="vacio">No hay gastos con esos filtros.</p>}

      {gastos.length > 0 && (
        <div className="tabla-contenedor">
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
                <tr key={g.id}>
                  <td className="tabla__suave">{fechaLegible(g.fecha)}</td>
                  <td className={`tabla__descripcion ${g.descripcion ? '' : 'tabla__suave'}`}>{g.descripcion || 'Sin descripción'}</td>
                  <td>
                    <span className="tabla__categoria">
                      <span className="gasto__punto" style={{ background: g.categoriaColor }} aria-hidden="true" />
                      {g.categoriaNombre}
                    </span>
                  </td>
                  <td className="tabla__numero tabla__monto">{formatearMonto(g.monto, g.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
