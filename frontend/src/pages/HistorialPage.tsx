import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { GraficoBarras } from '../components/GraficoBarras'
import { Monto } from '../components/Monto'
import { capitalizar, formatearMonto, nombreMes } from '../formato'
import type { Historial } from '../types'

const RANGOS = [6, 12, 24] as const
type Rango = (typeof RANGOS)[number]

const pesos = (n: number) => formatearMonto(Math.round(n))
const mesCorto = (mes: number) => capitalizar(nombreMes(mes).slice(0, 3))

export function HistorialPage() {
  const [rango, setRango] = useState<Rango>(12)
  const [historial, setHistorial] = useState<Historial | null>(null)
  const [error, setError] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    setError('')
    api.historial(rango)
      .then((h) => { if (vigente) setHistorial(h) })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [rango])

  // Categorías con gastos en el período, de la que más gastó a la que menos
  const categoriasConGastos = useMemo(() => {
    if (!historial) return []
    const totales = new Map<number, number>()
    for (const m of historial.meses) for (const c of m.porCategoria) totales.set(c.categoriaId, (totales.get(c.categoriaId) ?? 0) + c.total)
    return historial.categorias
      .filter((c) => (totales.get(c.id) ?? 0) > 0)
      .sort((a, b) => (totales.get(b.id) ?? 0) - (totales.get(a.id) ?? 0))
  }, [historial])

  const elegida = categoriasConGastos.find((c) => c.id === categoriaId) ?? categoriasConGastos[0] ?? null

  const encabezado = (
    <EncabezadoPagina
      titulo="Historial"
      subtitulo="Cómo vienen tus ingresos y gastos, mes a mes."
      acciones={
        <div className="segmentado" role="radiogroup" aria-label="Período">
          {RANGOS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rango === r} className="segmentado__opcion" onClick={() => setRango(r)}>
              {r} meses
            </button>
          ))}
        </div>
      }
    />
  )

  if (error) return <>{encabezado}<div className="aviso" role="alert"><p>{error}</p></div></>
  if (!historial) return <>{encabezado}<Esqueleto filas={4} conTitular={false} /></>

  const meses = historial.meses
  const cruzaAnios = meses.length > 0 && meses[0].anio !== meses[meses.length - 1].anio
  const etiquetas = meses.map((m) => mesCorto(m.mes) + (cruzaAnios && (m.mes === 1 || m === meses[0]) ? ` ${String(m.anio).slice(2)}` : ''))
  const conMovimientos = meses.filter((m) => m.ingresosARS > 0 || m.gastosARS > 0)
  const totalIngresos = meses.reduce((s, m) => s + m.ingresosARS, 0)
  const totalGastos = meses.reduce((s, m) => s + m.gastosARS, 0)
  const promedioGastos = conMovimientos.length ? totalGastos / conMovimientos.length : 0
  const mayor = meses.reduce((a, b) => (b.gastosARS > a.gastosARS ? b : a), meses[0])
  const nombreLargo = (m: { anio: number; mes: number }) => `${capitalizar(nombreMes(m.mes))} ${m.anio}`

  const valoresCategoria = elegida
    ? meses.map((m) => m.porCategoria.find((c) => c.categoriaId === elegida.id)?.total ?? 0)
    : []

  return (
    <>
      {encabezado}

      {conMovimientos.length === 0 ? (
        <div className="vacio">
          <h2 className="vacio__titulo">Todavía no hay movimientos</h2>
          <p className="vacio__texto">Cuando cargues ingresos y gastos, acá vas a ver cómo evolucionan en los últimos {rango} meses.</p>
        </div>
      ) : (
        <>
          <dl className="cifras">
            <div>
              <dt>Promedio de gastos por mes</dt>
              <dd><Monto valor={promedioGastos} /></dd>
            </div>
            <div>
              <dt>Ingresos menos gastos del período</dt>
              <dd className={totalIngresos - totalGastos >= 0 ? 'cifras__positivo' : 'cifras__negativo'}>
                <Monto valor={totalIngresos - totalGastos} conSigno />
              </dd>
            </div>
            <div>
              <dt>Mes con más gastos</dt>
              <dd className="cifras__texto">{nombreLargo(mayor)}<small><Monto valor={mayor.gastosARS} /></small></dd>
            </div>
            <div>
              <dt>Meses con movimientos</dt>
              <dd>{conMovimientos.length}</dd>
            </div>
          </dl>

          <section className="panel">
            <div className="panel__encabezado">
              <h2 className="panel__titulo">Ingresos y gastos por mes</h2>
              <ul className="leyenda" aria-label="Referencias">
              <li><span className="leyenda__marca" style={{ background: 'var(--serie-ingresos)' }} />Ingresos</li>
                <li><span className="leyenda__marca" style={{ background: 'var(--serie-gastos)' }} />Gastos</li>
              </ul>
            </div>
            <GraficoBarras
              etiquetas={etiquetas}
              series={[
                { nombre: 'Ingresos', color: 'var(--serie-ingresos)', valores: meses.map((m) => m.ingresosARS) },
                { nombre: 'Gastos', color: 'var(--serie-gastos)', valores: meses.map((m) => m.gastosARS) },
              ]}
              descripcion={`Ingresos y gastos en pesos de los últimos ${rango} meses. Los valores están en la tabla de abajo.`}
              detalle={(i) => {
                const m = meses[i]
                const saldo = m.ingresosARS - m.gastosARS
                return (
                  <>
                    <strong>{nombreLargo(m)}</strong>
                    <span className="grafico__fila"><i style={{ background: 'var(--serie-ingresos)' }} />Ingresos <b>{pesos(m.ingresosARS)}</b></span>
                    <span className="grafico__fila"><i style={{ background: 'var(--serie-gastos)' }} />Gastos <b>{pesos(m.gastosARS)}</b></span>
                    <span className="grafico__fila">{saldo >= 0 ? 'Sobró' : 'Faltó'} <b>{pesos(Math.abs(saldo))}</b></span>
                  </>
                )
              }}
            />
          </section>

          {elegida && (
            <section className="panel">
              <div className="panel__encabezado">
                <h2 className="panel__titulo">Evolución de una categoría</h2>
              </div>
              <div className="chips chips--compactos" role="radiogroup" aria-label="Categoría">
                {categoriasConGastos.map((c) => (
                  <label key={c.id} className="chip">
                    <input type="radio" name="categoria-historial" checked={c.id === elegida.id} onChange={() => setCategoriaId(c.id)} />
                    <span className="chip__punto" style={{ background: c.color }} />
                    {c.nombre}
                  </label>
                ))}
              </div>
              <GraficoBarras
                alto={200}
                etiquetas={etiquetas}
                series={[{ nombre: elegida.nombre, color: elegida.color, valores: valoresCategoria }]}
                descripcion={`Gastos en ${elegida.nombre} por mes, en pesos.`}
                detalle={(i) => (
                  <>
                    <strong>{nombreLargo(meses[i])}</strong>
                    <span className="grafico__fila">{elegida.nombre} <b>{pesos(valoresCategoria[i])}</b></span>
                  </>
                )}
              />
            </section>
          )}

          <section className="panel">
            <div className="panel__encabezado">
              <h2 className="panel__titulo">Mes por mes</h2>
            </div>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Mes</th>
                    <th scope="col" className="tabla__numero">Ingresos</th>
                    <th scope="col" className="tabla__numero">Gastos</th>
                    <th scope="col" className="tabla__numero">Diferencia</th>
                    <th scope="col" className="tabla__numero">Gastado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...meses].reverse().map((m) => {
                    const saldo = m.ingresosARS - m.gastosARS
                    return (
                      <tr key={`${m.anio}-${m.mes}`}>
                        <th scope="row">{nombreLargo(m)}</th>
                        <td className="tabla__numero"><Monto valor={m.ingresosARS} className="tabla__monto" /></td>
                        <td className="tabla__numero"><Monto valor={m.gastosARS} className="tabla__monto" /></td>
                        <td className={`tabla__numero ${saldo < 0 ? 'tabla__negativo' : ''}`}><Monto valor={saldo} conSigno className="tabla__monto" /></td>
                        <td className="tabla__numero tabla__suave">
                          {m.ingresosARS > 0 ? `${Math.round((m.gastosARS / m.ingresosARS) * 100)}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="nota">Solo montos en pesos.</p>
          </section>
        </>
      )}
    </>
  )
}
