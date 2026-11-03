import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { HojaIngreso } from '../components/HojaIngreso'
import { SelectorMes } from '../components/SelectorMes'
import { etiquetaDia, formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Ingreso } from '../types'

export function IngresosPage() {
  const { anio, mes, esMesActual } = useMes()
  const [ingresos, setIngresos] = useState<Ingreso[] | null>(null)
  const [error, setError] = useState('')
  const [copiando, setCopiando] = useState(false)
  const [hoja, setHoja] = useState<{ abierta: boolean; ingreso: Ingreso | null }>({ abierta: false, ingreso: null })

  const cargar = useCallback(async () => {
    setError('')
    try {
      setIngresos(await api.ingresos(anio, mes))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setIngresos(null)
    cargar()
  }, [cargar])

  async function copiarMesAnterior() {
    setCopiando(true)
    setError('')
    try {
      await api.copiarIngresosMesAnterior(anio, mes)
      await cargar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCopiando(false)
    }
  }

  const totalARS = ingresos?.filter((i) => i.moneda === 'ARS').reduce((s, i) => s + i.monto, 0) ?? 0
  const totalUSD = ingresos?.filter((i) => i.moneda === 'USD').reduce((s, i) => s + i.monto, 0) ?? 0
  // Si se mira un mes que no es el actual, el ingreso nuevo arranca en el día 1 de ese mes
  const fechaPorDefecto = esMesActual ? hoyISO() : `${anio}-${String(mes).padStart(2, '0')}-01`
  const mesAnterior = nombreMes(mes === 1 ? 12 : mes - 1)

  return (
    <>
      <SelectorMes />

      <section className="total" aria-label="Ingresos del mes">
        <p className="total__etiqueta">Ingresos del mes</p>
        <p className="total__monto total__monto--ingreso">{ingresos ? formatearMonto(totalARS) : '—'}</p>
        {totalUSD > 0 && <p className="total__usd">y {formatearMonto(totalUSD, 'USD')}</p>}
      </section>

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {ingresos === null && !error && <p className="cargando">Cargando ingresos…</p>}

      {ingresos?.length === 0 && (
        <div className="vacio">
          <p>No hay ingresos en {nombreMes(mes)}.</p>
          <div className="vacio__acciones">
            <button type="button" className="boton boton--primario" onClick={() => setHoja({ abierta: true, ingreso: null })}>
              Agregar ingreso
            </button>
            <button type="button" className="boton boton--secundario" onClick={copiarMesAnterior} disabled={copiando}>
              {copiando ? 'Copiando…' : `Copiar los de ${mesAnterior}`}
            </button>
          </div>
        </div>
      )}

      {ingresos && ingresos.length > 0 && (
        <ul className="lista-gastos">
          {ingresos.map((i) => (
            <li key={i.id}>
              <button type="button" className="gasto" onClick={() => setHoja({ abierta: true, ingreso: i })}>
                <span className="gasto__punto gasto__punto--ingreso" aria-hidden="true" />
                <span className="gasto__texto">
                  <span className="gasto__descripcion">{i.descripcion}</span>
                  <span className="gasto__categoria">{etiquetaDia(i.fecha)}</span>
                </span>
                <span className="gasto__monto">{formatearMonto(i.monto, i.moneda)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {ingresos && ingresos.length > 0 && (
        <button
          type="button"
          className="boton-flotante"
          onClick={() => setHoja({ abierta: true, ingreso: null })}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Agregar ingreso
        </button>
      )}

      <HojaIngreso
        abierta={hoja.abierta}
        ingreso={hoja.ingreso}
        fechaPorDefecto={fechaPorDefecto}
        alCerrar={() => setHoja((h) => ({ ...h, abierta: false }))}
        alGuardar={() => {
          setHoja((h) => ({ ...h, abierta: false }))
          cargar()
        }}
      />
    </>
  )
}
