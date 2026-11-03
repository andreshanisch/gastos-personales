import { useEffect, useState } from 'react'
import { api } from '../api'
import { SelectorMes } from '../components/SelectorMes'
import { formatearMonto, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { ResumenMensual } from '../types'

export function ResumenPage() {
  const { anio, mes } = useMes()
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setResumen(null)
    setError('')
    api.resumen(anio, mes)
      .then((r) => { if (vigente) setResumen(r) })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [anio, mes])

  const maximo = Math.max(0, ...(resumen?.porCategoria.map((c) => c.totalARS) ?? []))

  return (
    <>
      <SelectorMes />

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}
      {!resumen && !error && <p className="cargando">Calculando resumen…</p>}

      {resumen && (
        <>
          <dl className="cifras">
            <div>
              <dt>Total en pesos</dt>
              <dd>{formatearMonto(resumen.totalARS)}</dd>
            </div>
            <div>
              <dt>{capitalizarMes(resumen.mes === 1 ? 12 : resumen.mes - 1)}</dt>
              <dd>{formatearMonto(resumen.totalARSMesAnterior)}</dd>
            </div>
            {resumen.totalUSD > 0 && (
              <div>
                <dt>Total en dólares</dt>
                <dd>{formatearMonto(resumen.totalUSD, 'USD')}</dd>
              </div>
            )}
            <div>
              <dt>Cantidad de gastos</dt>
              <dd>{resumen.cantidadGastos}</dd>
            </div>
          </dl>

          {resumen.porCategoria.length === 0 ? (
            <p className="vacio">No hay gastos en {nombreMes(mes)} todavía.</p>
          ) : (
            <section>
              <h2 className="seccion-titulo">Por categoría</h2>
              <ul className="ranking">
                {resumen.porCategoria.map((c) => {
                  const porcentaje = resumen.totalARS > 0 ? Math.round((c.totalARS / resumen.totalARS) * 100) : 0
                  const soloDolares = c.totalARS === 0 && c.totalUSD > 0
                  return (
                    <li key={c.categoriaId} className="ranking__fila">
                      <div className="ranking__linea">
                        <span className="ranking__nombre">{c.nombre}</span>
                        <span className="ranking__monto">
                          {soloDolares ? formatearMonto(c.totalUSD, 'USD') : formatearMonto(c.totalARS)}
                        </span>
                      </div>
                      <div className="ranking__barra" aria-hidden="true">
                        <span style={{ width: `${maximo ? (c.totalARS / maximo) * 100 : 0}%`, background: c.color }} />
                      </div>
                      <p className="ranking__detalle">
                        {soloDolares ? 'En dólares' : `${porcentaje}% del mes`}, {c.cantidad} {c.cantidad === 1 ? 'gasto' : 'gastos'}
                        {c.totalUSD > 0 && !soloDolares && ` y ${formatearMonto(c.totalUSD, 'USD')}`}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}

function capitalizarMes(mes: number) {
  const nombre = nombreMes(mes)
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}
