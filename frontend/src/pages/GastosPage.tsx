import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import { HojaGasto } from '../components/HojaGasto'
import { ReglaCategorias } from '../components/ReglaCategorias'
import { SelectorMes } from '../components/SelectorMes'
import { etiquetaDia, formatearMonto, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Categoria, Gasto, ResumenMensual } from '../types'

export function GastosPage() {
  const { anio, mes } = useMes()
  const [gastos, setGastos] = useState<Gasto[] | null>(null)
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [error, setError] = useState('')
  const [hoja, setHoja] = useState<{ abierta: boolean; gasto: Gasto | null }>({ abierta: false, gasto: null })

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [g, r, c] = await Promise.all([api.gastos(anio, mes), api.resumen(anio, mes), api.categorias()])
      setGastos(g)
      setResumen(r)
      setCategorias(c)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setGastos(null)
    cargar()
  }, [cargar])

  const porDia = agruparPorDia(gastos ?? [])

  return (
    <>
      <SelectorMes />

      <section className="total" aria-label="Total del mes">
        <p className="total__monto">{resumen ? formatearMonto(resumen.totalARS) : '—'}</p>
        {resumen && resumen.totalUSD > 0 && (
          <p className="total__usd">y {formatearMonto(resumen.totalUSD, 'USD')}</p>
        )}
        {resumen && <Saldo resumen={resumen} />}
        {resumen && <Comparacion resumen={resumen} />}
        <ReglaCategorias categorias={resumen?.porCategoria ?? []} ingresos={resumen?.ingresosARS ?? 0} />
      </section>

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {gastos === null && !error && <p className="cargando">Cargando gastos…</p>}

      {gastos?.length === 0 && (
        <div className="vacio">
          <p>No hay gastos en {nombreMes(mes)}.</p>
          <button type="button" className="boton boton--primario" onClick={() => setHoja({ abierta: true, gasto: null })}>
            Agregar el primero
          </button>
        </div>
      )}

      {porDia.map(([fecha, delDia]) => (
        <section key={fecha} className="dia">
          <h2 className="dia__titulo">{etiquetaDia(fecha)}</h2>
          <ul className="lista-gastos">
            {delDia.map((g) => (
              <li key={g.id}>
                <button type="button" className="gasto" onClick={() => setHoja({ abierta: true, gasto: g })}>
                  <span className="gasto__punto" style={{ background: g.categoriaColor }} aria-hidden="true" />
                  <span className="gasto__texto">
                    <span className="gasto__descripcion">{g.descripcion}</span>
                    <span className="gasto__categoria">{g.categoriaNombre}</span>
                  </span>
                  <span className="gasto__monto">{formatearMonto(g.monto, g.moneda)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <button
        type="button"
        className="boton-flotante"
        onClick={() => setHoja({ abierta: true, gasto: null })}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        Agregar gasto
      </button>

      <HojaGasto
        abierta={hoja.abierta}
        gasto={hoja.gasto}
        categorias={categorias}
        alCerrar={() => setHoja((h) => ({ ...h, abierta: false }))}
        alGuardar={() => {
          setHoja((h) => ({ ...h, abierta: false }))
          cargar()
        }}
      />
    </>
  )
}

/** Cuánto queda del ingreso del mes (o cuánto se pasó), en pesos. */
function Saldo({ resumen }: { resumen: ResumenMensual }) {
  if (resumen.ingresosARS === 0) {
    return (
      <p className="saldo">
        <Link to="/ingresos" className="saldo__enlace">Cargá tus ingresos del mes</Link> para ver cuánto te queda.
      </p>
    )
  }

  const disponible = resumen.ingresosARS - resumen.totalARS
  const porcentaje = Math.round((resumen.totalARS / resumen.ingresosARS) * 100)
  return (
    <p className={`saldo ${disponible < 0 ? 'saldo--excedido' : ''}`}>
      {disponible >= 0
        ? <>Te quedan <strong>{formatearMonto(disponible)}</strong></>
        : <>Te pasaste por <strong>{formatearMonto(-disponible)}</strong></>}
      {' '}de {formatearMonto(resumen.ingresosARS)} de ingresos ({porcentaje}% gastado)
    </p>
  )
}

function Comparacion({ resumen }: { resumen: ResumenMensual }) {
  const anterior = resumen.totalARSMesAnterior
  const mesAnterior = nombreMes(resumen.mes === 1 ? 12 : resumen.mes - 1)
  if (anterior === 0) return <p className="total__comparacion">Sin gastos en {mesAnterior} para comparar</p>

  const variacion = Math.round(((resumen.totalARS - anterior) / anterior) * 100)
  const texto = variacion === 0
    ? `Igual que en ${mesAnterior}`
    : `${Math.abs(variacion)}% ${variacion > 0 ? 'más' : 'menos'} que en ${mesAnterior}`

  return (
    <p className={`total__comparacion ${variacion > 0 ? 'total__comparacion--sube' : ''}`}>
      {texto}
    </p>
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
