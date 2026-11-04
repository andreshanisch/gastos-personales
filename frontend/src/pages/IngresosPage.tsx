import { useCallback, useEffect, useState } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { Monto } from '../components/Monto'
import { etiquetaDia, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import type { Ingreso } from '../types'

export function IngresosPage() {
  const { anio, mes } = useMes()
  const { version, nuevoIngreso, editarIngreso, refrescar } = useAcciones()
  const avisar = useAvisos()
  const [ingresos, setIngresos] = useState<Ingreso[] | null>(null)
  const [error, setError] = useState('')
  const [copiando, setCopiando] = useState(false)

  const cargar = useCallback(async () => {
    setError('')
    try {
      setIngresos(await api.ingresos(anio, mes))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => { setIngresos(null) }, [anio, mes])
  useEffect(() => { cargar() }, [cargar, version])

  async function copiarMesAnterior() {
    setCopiando(true)
    setError('')
    try {
      const copiados = await api.copiarIngresosMesAnterior(anio, mes)
      avisar(copiados.length === 1 ? 'Se copió 1 ingreso' : `Se copiaron ${copiados.length} ingresos`)
      refrescar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCopiando(false)
    }
  }

  const totalARS = ingresos?.filter((i) => i.moneda === 'ARS').reduce((s, i) => s + i.monto, 0) ?? 0
  const totalUSD = ingresos?.filter((i) => i.moneda === 'USD').reduce((s, i) => s + i.monto, 0) ?? 0
  const mesAnterior = nombreMes(mes === 1 ? 12 : mes - 1)
  const hoy = hoyISO()
  const porCobrar = ingresos?.filter((i) => i.fecha > hoy) ?? []

  return (
    <>
      <EncabezadoPagina
        titulo="Ingresos"
        subtitulo="Lo que cobrás en el mes. El plan lo reparte desde la fecha en que entra."
        conMes
      />

      {error && (
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {ingresos === null && !error && <Esqueleto filas={3} />}

      {ingresos && ingresos.length > 0 && (
        <section className="titular" aria-label="Ingresos del mes">
          <p className="titular__etiqueta">Ingresos de {nombreMes(mes)}</p>
          <Monto valor={totalARS} className="titular__monto titular__monto--ingreso" />
          {totalUSD > 0 && <p className="titular__secundario">y <Monto valor={totalUSD} moneda="USD" /></p>}
          {porCobrar.length > 0 && (
            <p className="comparacion">
              {porCobrar.length === 1 ? '1 ingreso todavía no se cobró' : `${porCobrar.length} ingresos todavía no se cobraron`}.
            </p>
          )}
        </section>
      )}

      {ingresos?.length === 0 && (
        <div className="vacio">
          <h2 className="vacio__titulo">Todavía no hay ingresos en {nombreMes(mes)}</h2>
          <p className="vacio__texto">
            Cargá tu sueldo y cualquier otro ingreso con la fecha en que lo cobrás. Si se repiten todos los meses,
            podés traer los de {mesAnterior} con un clic.
          </p>
          <div className="vacio__acciones">
            <button type="button" className="boton boton--primario" onClick={nuevoIngreso}>Cargar un ingreso</button>
            <button type="button" className="boton boton--secundario" onClick={copiarMesAnterior} disabled={copiando}>
              {copiando ? 'Copiando…' : `Copiar los de ${mesAnterior}`}
            </button>
          </div>
        </div>
      )}

      {ingresos && ingresos.length > 0 && (
        <section className="panel">
          <div className="panel__encabezado">
            <h2 className="panel__titulo">Detalle</h2>
            <button type="button" className="boton-texto boton-texto--chico" onClick={nuevoIngreso}>Agregar otro</button>
          </div>
          <ul>
            {ingresos.map((i) => (
              <li key={i.id}>
                <button type="button" className="fila" onClick={() => editarIngreso(i)} aria-label={`${i.descripcion}. Editar`}>
                  <span className="fila__punto fila__punto--ingreso" aria-hidden="true" />
                  <span className="fila__texto">
                    <span className="fila__principal">{i.descripcion}</span>
                    <span className="fila__secundario">
                      {etiquetaDia(i.fecha)}{i.fecha > hoy ? ', por cobrar' : ''}
                    </span>
                  </span>
                  <Monto valor={i.monto} moneda={i.moneda} className="fila__monto" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
