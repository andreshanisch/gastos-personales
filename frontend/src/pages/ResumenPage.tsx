import { useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { Monto } from '../components/Monto'
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

  const disponible = resumen ? resumen.ingresosARS - resumen.totalARS : 0
  const maximo = Math.max(0, ...(resumen?.porCategoria.map((c) => c.totalARS) ?? []))

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
        <>
          <dl className="cifras">
            <div>
              <dt>Ingresos</dt>
              <dd><Monto valor={resumen.ingresosARS} /></dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd><Monto valor={resumen.totalARS} /></dd>
            </div>
            {resumen.ingresosARS > 0 && (
              <div>
                <dt>{disponible >= 0 ? 'Disponible' : 'Excedido'}</dt>
                <dd className={disponible >= 0 ? 'cifras__positivo' : 'cifras__negativo'}>
                  <Monto valor={Math.abs(disponible)} />
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
              <dd><Monto valor={resumen.totalARSMesAnterior} /></dd>
            </div>
            {resumen.ingresosUSD > 0 && (
              <div>
                <dt>Ingresos en dólares</dt>
                <dd><Monto valor={resumen.ingresosUSD} moneda="USD" /></dd>
              </div>
            )}
            {resumen.totalUSD > 0 && (
              <div>
                <dt>Gastos en dólares</dt>
                <dd><Monto valor={resumen.totalUSD} moneda="USD" /></dd>
              </div>
            )}
            <div>
              <dt>Cantidad de gastos</dt>
              <dd>{resumen.cantidadGastos}</dd>
            </div>
          </dl>

          {resumen.porCategoria.length === 0 ? (
            <div className="vacio">
              <h2 className="vacio__titulo">Todavía no hay gastos en {nombreMes(mes)}</h2>
              <p className="vacio__texto">Cuando cargues gastos, acá vas a ver cuánto se llevó cada categoría.</p>
            </div>
          ) : (
            <section className="panel">
              <div className="panel__encabezado">
                <h2 className="panel__titulo">Por categoría</h2>
                <span className="panel__ayuda" style={{ margin: 0 }}>De mayor a menor</span>
              </div>
              <ul className="ranking">
                {resumen.porCategoria.map((c) => {
                  // Con ingresos cargados, el porcentaje es sobre lo que ingresó; si no, sobre lo gastado
                  const base = resumen.ingresosARS > 0 ? resumen.ingresosARS : resumen.totalARS
                  const porcentaje = base > 0 ? Math.round((c.totalARS / base) * 100) : 0
                  const textoPorcentaje = porcentaje === 0 && c.totalARS > 0 ? 'Menos del 1%' : `${porcentaje}%`
                  const soloDolares = c.totalARS === 0 && c.totalUSD > 0
                  const abierta = abiertas.has(c.categoriaId)
                  const idDetalle = `categoria-${c.categoriaId}-gastos`
                  return (
                    <li key={c.categoriaId} className={`ranking__fila ${abierta ? 'ranking__fila--abierta' : ''}`}>
                      <button
                        type="button"
                        className="ranking__boton"
                        aria-expanded={abierta}
                        aria-controls={idDetalle}
                        onClick={() => alternar(c.categoriaId)}
                      >
                        <div className="ranking__linea">
                          <span className="ranking__nombre">
                            <Flecha />
                            {c.nombre}
                          </span>
                          {soloDolares
                            ? <Monto valor={c.totalUSD} moneda="USD" className="ranking__monto" />
                            : <Monto valor={c.totalARS} className="ranking__monto" />}
                        </div>
                        <div className="ranking__barra" aria-hidden="true">
                          <span style={{ width: `${maximo ? (c.totalARS / maximo) * 100 : 0}%`, background: c.color }} />
                        </div>
                        <p className="ranking__detalle">
                          {soloDolares ? 'En dólares' : `${textoPorcentaje} ${resumen.ingresosARS > 0 ? 'de tus ingresos' : 'del mes'}`}, {c.cantidad} {c.cantidad === 1 ? 'gasto' : 'gastos'}
                          {c.totalUSD > 0 && !soloDolares && ` y ${formatearMonto(c.totalUSD, 'USD')}`}
                        </p>
                      </button>
                      {abierta && (
                        <ul id={idDetalle} className="ranking__gastos">
                          {gastosDeCategoria(gastos, c.categoriaId).map((g) => (
                            <li key={g.id}>
                              <button type="button" className="ranking__gasto" onClick={() => editarGasto(g)} aria-label={`${g.descripcion || 'Sin descripción'}. Editar`}>
                                <span className="ranking__gasto-fecha">{fechaCorta(g.fecha)}</span>
                                <span className={`ranking__gasto-descripcion ${g.descripcion ? '' : 'ranking__gasto-descripcion--vacia'}`}>
                                  {g.descripcion || 'Sin descripción'}
                                </span>
                                <Monto valor={g.monto} moneda={g.moneda} className="ranking__gasto-monto" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
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

function Flecha() {
  return (
    <svg className="ranking__flecha" width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
