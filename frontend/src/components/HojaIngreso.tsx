import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'
import { parsearMonto } from '../formato'
import type { Ingreso, Moneda } from '../types'

interface Props {
  abierta: boolean
  ingreso: Ingreso | null // null = ingreso nuevo
  fechaPorDefecto: string
  alCerrar: () => void
  alGuardar: () => void
}

/** Panel para cargar o editar un ingreso del mes. */
export function HojaIngreso({ abierta, ingreso, fechaPorDefecto, alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(fechaPorDefecto)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierta && !d.open) {
      setMonto(ingreso ? String(ingreso.monto).replace('.', ',') : '')
      setMoneda(ingreso?.moneda ?? 'ARS')
      setDescripcion(ingreso?.descripcion ?? '')
      setFecha(ingreso?.fecha ?? fechaPorDefecto)
      setError('')
      d.showModal()
    } else if (!abierta && d.open) {
      d.close()
    }
  }, [abierta, ingreso, fechaPorDefecto])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const valor = parsearMonto(monto)
    if (valor === null) return setError('Escribí un monto mayor a cero, por ejemplo 850.000 o 1200,50.')
    if (!descripcion.trim()) return setError('Agregá una descripción corta, por ejemplo "Sueldo".')

    setGuardando(true)
    setError('')
    try {
      const datos = { fecha, monto: valor, moneda, descripcion: descripcion.trim() }
      if (ingreso) await api.editarIngreso(ingreso.id, datos)
      else await api.crearIngreso(datos)
      alGuardar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!ingreso || !confirm(`¿Eliminar "${ingreso.descripcion}"?`)) return
    setGuardando(true)
    try {
      await api.eliminarIngreso(ingreso.id)
      alGuardar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="hoja"
      onClose={alCerrar}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar() }}
      aria-labelledby="hoja-ingreso-titulo"
    >
      <form className="hoja__cuerpo" onSubmit={guardar} noValidate>
        <div className="hoja__encabezado">
          <h2 id="hoja-ingreso-titulo">{ingreso ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
          <button type="button" className="boton-texto" onClick={alCerrar}>Cancelar</button>
        </div>

        <div className="campo-monto">
          <div className="segmentado" role="radiogroup" aria-label="Moneda">
            {(['ARS', 'USD'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={moneda === m}
                className="segmentado__opcion"
                onClick={() => setMoneda(m)}
              >
                {m === 'ARS' ? '$' : 'US$'}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="monto-ingreso">Monto</label>
          <input
            id="monto-ingreso"
            className="campo-monto__input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            autoFocus={!ingreso}
          />
        </div>

        <label className="campo">
          <span className="campo__etiqueta">Descripción</span>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={100}
            placeholder="Sueldo, aguinaldo, trabajo extra…"
          />
        </label>

        <label className="campo">
          <span className="campo__etiqueta">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="hoja__acciones">
          {ingreso && (
            <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>
              Eliminar
            </button>
          )}
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : ingreso ? 'Guardar cambios' : 'Guardar ingreso'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
