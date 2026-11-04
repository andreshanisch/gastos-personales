import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'
import { montoParaEditar, parsearMonto } from '../formato'
import type { Ingreso, Moneda } from '../types'
import { useAvisos } from './Avisos'
import { CampoMonto } from './CampoMonto'
import { useConfirmar } from './Confirmar'

interface Props {
  abierta: boolean
  ingreso: Ingreso | null // null = ingreso nuevo
  fechaPorDefecto: string
  alCerrar: () => void
  alGuardar: () => void
}

const SUGERENCIAS = ['Sueldo', 'Aguinaldo', 'Trabajo extra', 'Reintegro']

/** Diálogo para cargar o editar un ingreso del mes. */
export function HojaIngreso({ abierta, ingreso, fechaPorDefecto, alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const avisar = useAvisos()
  const confirmar = useConfirmar()
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
      setMonto(ingreso ? montoParaEditar(ingreso.monto) : '')
      setMoneda(ingreso?.moneda ?? 'ARS')
      setDescripcion(ingreso?.descripcion ?? '')
      setFecha(ingreso?.fecha ?? fechaPorDefecto)
      setError('')
      d.showModal()
      requestAnimationFrame(() => (d.querySelector('#monto-ingreso') as HTMLInputElement | null)?.focus())
    } else if (!abierta && d.open) {
      d.close()
    }
  }, [abierta, ingreso, fechaPorDefecto])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const valor = parsearMonto(monto)
    if (valor === null) return setError('Escribí un monto mayor a cero, por ejemplo 850.000 o 1.200,50.')
    if (!descripcion.trim()) return setError('Agregá una descripción corta, por ejemplo "Sueldo".')

    setGuardando(true)
    setError('')
    try {
      const datos = { fecha, monto: valor, moneda, descripcion: descripcion.trim() }
      if (ingreso) await api.editarIngreso(ingreso.id, datos)
      else await api.crearIngreso(datos)
      avisar(ingreso ? 'Cambios guardados' : 'Ingreso guardado')
      alGuardar()
      alCerrar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!ingreso) return
    const ok = await confirmar({
      titulo: '¿Eliminar este ingreso?',
      mensaje: `"${ingreso.descripcion}" se borra y el plan del mes se recalcula sin él.`,
      confirmar: 'Eliminar ingreso',
      peligro: true,
    })
    if (!ok) return
    setGuardando(true)
    try {
      await api.eliminarIngreso(ingreso.id)
      avisar('Ingreso eliminado')
      alGuardar()
      alCerrar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo dialogo--hoja"
      onClose={alCerrar}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar() }}
      aria-labelledby="hoja-ingreso-titulo"
    >
      <form className="dialogo__cuerpo" onSubmit={guardar} noValidate>
        <div className="dialogo__encabezado">
          <h2 id="hoja-ingreso-titulo" className="dialogo__titulo">{ingreso ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
          <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <CampoMonto
          id="monto-ingreso"
          valor={monto}
          alCambiar={setMonto}
          moneda={moneda}
          alCambiarMoneda={setMoneda}
          autoFocus={!ingreso}
        />

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="descripcion-ingreso">Descripción</label>
          <input
            id="descripcion-ingreso"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={100}
            placeholder="Sueldo, aguinaldo, trabajo extra…"
          />
          {!ingreso && (
            <div className="sugerencias" aria-label="Sugerencias">
              {SUGERENCIAS.map((s) => (
                <button key={s} type="button" className="sugerencia" onClick={() => setDescripcion(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>

        <label className="campo">
          <span className="campo__etiqueta">Fecha en que lo cobrás</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          <span className="campo__ayuda">El plan reparte cada ingreso desde la semana en que entra.</span>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="dialogo__acciones">
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
