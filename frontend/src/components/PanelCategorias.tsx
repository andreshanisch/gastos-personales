import { Link } from 'react-router'
import { formatearMonto } from '../formato'
import type { ResumenMensual } from '../types'

/** Tabla lateral con el total del mes por categoría, de mayor a menor. */
export function PanelCategorias({ resumen }: { resumen: ResumenMensual | null }) {
  const filas = resumen?.porCategoria ?? []
  const conIngresos = (resumen?.ingresosARS ?? 0) > 0
  // El porcentaje es sobre los ingresos si están cargados; si no, sobre lo gastado en el mes
  const base = conIngresos ? resumen!.ingresosARS : (resumen?.totalARS ?? 0)

  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <h2 id="panel-titulo" className="panel__titulo">Por categoría</h2>

      {!resumen && <p className="panel__vacio">Calculando…</p>}
      {resumen && filas.length === 0 && <p className="panel__vacio">Todavía no hay gastos este mes.</p>}

      {filas.length > 0 && (
        <table className="tabla-categorias">
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              <th scope="col" className="tabla-categorias__numero">Total</th>
              <th scope="col" className="tabla-categorias__numero">{conIngresos ? '% ingreso' : '% mes'}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => {
              const soloDolares = c.totalARS === 0 && c.totalUSD > 0
              return (
                <tr key={c.categoriaId}>
                  <th scope="row">
                    <span className="tabla-categorias__categoria">
                      <span className="gasto__punto" style={{ background: c.color }} aria-hidden="true" />
                      <span className="tabla-categorias__nombre">{c.nombre}</span>
                    </span>
                  </th>
                  <td className="tabla-categorias__numero tabla-categorias__monto">
                    {soloDolares ? formatearMonto(c.totalUSD, 'USD') : formatearMonto(c.totalARS)}
                  </td>
                  <td className="tabla-categorias__numero tabla-categorias__porcentaje">
                    {soloDolares || base === 0 ? '—' : porcentaje(c.totalARS, base)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="tabla-categorias__numero tabla-categorias__monto">{formatearMonto(resumen!.totalARS)}</td>
              <td className="tabla-categorias__numero tabla-categorias__porcentaje">
                {base === 0 ? '—' : porcentaje(resumen!.totalARS, base)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {resumen && resumen.totalUSD > 0 && (
        <p className="panel__nota">Además, {formatearMonto(resumen.totalUSD, 'USD')} en gastos en dólares.</p>
      )}

      <Link to="/resumen" className="panel__enlace">Ver el resumen completo</Link>
    </aside>
  )
}

/** Porcentaje redondeado; si es mayor a cero pero redondea a 0, muestra "<1%". */
function porcentaje(parte: number, total: number) {
  const valor = Math.round((parte / total) * 100)
  return valor === 0 && parte > 0 ? '<1%' : `${valor}%`
}
