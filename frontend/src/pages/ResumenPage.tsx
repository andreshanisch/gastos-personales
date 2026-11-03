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

  const disponible = resumen ? resumen.ingresosARS - resumen.totalARS : 0
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
              <dt>Ingresos</dt>
              <dd>{formatearMonto(resumen.ingresosARS)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd>{formatearMonto(resumen.totalARS)}</dd>
            </div>
            {resumen.ingresosARS > 0 && (
              <div>
                <dt>{disponible >= 0 ? 'Disponible' : 'Excedido'}</dt>
                <dd className={disponible >= 0 ? 'cifras__positivo' : 'cifras__negativo'}>
                  {formatearMonto(Math.abs(disponible))}
                </dd>
              </div>
            )}
            {resumen.ingresosARS > 0 && (
              <div>
                <dt>Del ingreso, gastado</dt>
                <dd>{Math.round((resumen.totalARS / resumen.ingresosARS) * 100)}%</dd>
              </div>
            )}
            <div>
              <dt>Gastos de {nombreMes(resumen.mes === 1 ? 12 : resumen.mes - 1)}</dt>
              <dd>{formatearMonto(resumen.totalARSMesAnterior)}</dd>
            </div>
            {resumen.ingresosUSD > 0 && (
              <div>
                <dt>Ingresos en dólares</dt>
                <dd>{formatearMonto(resumen.ingresosUSD, 'USD')}</dd>
              </div>
            )}
            {resumen.totalUSD > 0 && (
              <div>
                <dt>Gastos en dólares</dt>
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
                  // Con ingresos cargados, el porcentaje es sobre lo que ingresó; si no, sobre lo gastado
                  const base = resumen.ingresosARS > 0 ? resumen.ingresosARS : resumen.totalARS
                  const porcentaje = base > 0 ? Math.round((c.totalARS / base) * 100) : 0
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
                        {soloDolares ? 'En dólares' : `${porcentaje}% ${resumen.ingresosARS > 0 ? 'de tus ingresos' : 'del mes'}`}, {c.cantidad} {c.cantidad === 1 ? 'gasto' : 'gastos'}
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
