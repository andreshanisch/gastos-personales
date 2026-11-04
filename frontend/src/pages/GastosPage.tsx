import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { Monto } from '../components/Monto'
import { ReglaCategorias } from '../components/ReglaCategorias'
import { etiquetaDia, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Gasto, ResumenMensual } from '../types'

export function GastosPage() {
  const { anio, mes } = useMes()
  const { version, nuevoGasto, editarGasto } = useAcciones()
  const [gastos, setGastos] = useState<Gasto[] | null>(null)
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [g, r] = await Promise.all([api.gastos(anio, mes), api.resumen(anio, mes)])
      setGastos(g)
      setResumen(r)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setGastos(null)
    setResumen(null)
  }, [anio, mes])

  useEffect(() => { cargar() }, [cargar, version])

  const porDia = agruparPorDia(gastos ?? [])

  return (
    <>
      <EncabezadoPagina
        titulo="Gastos"
        subtitulo="Todo lo que gastaste en el mes, día por día."
        acciones={
          <Link to="/buscar" className="boton boton--secundario boton--chico">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Buscar y exportar
          </Link>
        }
        conMes
      />

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {!resumen && !error && <Esqueleto filas={5} />}

      {resumen && (
        <section className="titular" aria-label="Total del mes">
          <p className="titular__etiqueta">Gastaste en {nombreMes(mes)}</p>
          <Monto valor={resumen.totalARS} className="titular__monto" />
          {resumen.totalUSD > 0 && (
            <p className="titular__secundario">y <Monto valor={resumen.totalUSD} moneda="USD" /></p>
          )}
          <Saldo resumen={resumen} />
          <Comparacion resumen={resumen} />
          <ReglaCategorias categorias={resumen.porCategoria} ingresos={resumen.ingresosARS} />
        </section>
      )}

      {gastos?.length === 0 && (
        <div className="vacio">
          <h2 className="vacio__titulo">Todavía no hay gastos en {nombreMes(mes)}</h2>
          <p className="vacio__texto">Cargá el primero con el botón de abajo o apretando la tecla N desde cualquier pantalla.</p>
          <div className="vacio__acciones">
            <button type="button" className="boton boton--primario" onClick={nuevoGasto}>Cargar un gasto</button>
          </div>
        </div>
      )}

      {porDia.map(([fecha, delDia]) => (
        <section key={fecha} className="dia" aria-label={etiquetaDia(fecha)}>
          <div className="dia__encabezado">
            <h2 className="dia__titulo">{etiquetaDia(fecha)}</h2>
            <TotalDia gastos={delDia} />
          </div>
          <ul>
            {delDia.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="fila"
                  onClick={() => editarGasto(g)}
                  aria-label={`${g.descripcion || g.categoriaNombre}, ${g.categoriaNombre}. Editar`}
                >
                  <span className="fila__punto" style={{ background: g.categoriaColor }} aria-hidden="true" />
                  <span className="fila__texto">
                    <span className="fila__principal">{g.descripcion || g.categoriaNombre}</span>
                    {g.descripcion && <span className="fila__secundario">{g.categoriaNombre}</span>}
                  </span>
                  <Monto valor={g.monto} moneda={g.moneda} className="fila__monto" />
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/** Total del día en pesos (y en dólares si hay) */
function TotalDia({ gastos }: { gastos: Gasto[] }) {
  const ars = gastos.filter((g) => g.moneda === 'ARS').reduce((s, g) => s + g.monto, 0)
  const usd = gastos.filter((g) => g.moneda === 'USD').reduce((s, g) => s + g.monto, 0)
  return (
    <span className="dia__total">
      {ars > 0 && <Monto valor={ars} />}
      {ars > 0 && usd > 0 && ' y '}
      {usd > 0 && <Monto valor={usd} moneda="USD" />}
    </span>
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
      {disponible >= 0 ? 'Te quedan ' : 'Te pasaste por '}
      <Monto valor={Math.abs(disponible)} />
      {' '}de tus ingresos de <Monto valor={resumen.ingresosARS} className="saldo__ingreso" />. Gastaste el {porcentaje}%.
    </p>
  )
}

function Comparacion({ resumen }: { resumen: ResumenMensual }) {
  const anterior = resumen.totalARSMesAnterior
  const mesAnterior = nombreMes(resumen.mes === 1 ? 12 : resumen.mes - 1)
  if (anterior === 0) return <p className="comparacion">Sin gastos en {mesAnterior} para comparar.</p>

  const variacion = Math.round(((resumen.totalARS - anterior) / anterior) * 100)
  const texto = variacion === 0
    ? `Igual que en ${mesAnterior}.`
    : `${Math.abs(variacion)}% ${variacion > 0 ? 'más' : 'menos'} que en ${mesAnterior}.`

  return <p className={`comparacion ${variacion > 0 ? 'comparacion--sube' : ''}`}>{texto}</p>
}

function Chevron() {
  return (
    <svg className="fila__chevron" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
