import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { hoyISO, montoParaEditar, parsearMonto } from '../formato'
import type { Categoria, Gasto, Moneda } from '../types'
import { useAvisos } from './Avisos'
import { CampoMonto } from './CampoMonto'
import { useConfirmar } from './Confirmar'

interface Props {
  abierta: boolean
  gasto: Gasto | null // null = gasto nuevo
  categorias: Categoria[]
  alCerrar: () => void
  alGuardar: () => void
}

/** Diálogo para cargar o editar un gasto. */
export function HojaGasto({ abierta, gasto, categorias, alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const campoMonto = useRef<HTMLDivElement>(null)
  const avisar = useAvisos()
  const confirmar = useConfirmar()
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function reiniciar(desde: Gasto | null, conservarFecha = false) {
    setMonto(desde ? montoParaEditar(desde.monto) : '')
    setMoneda(desde?.moneda ?? 'ARS')
    setDescripcion(desde?.descripcion ?? '')
    setCategoriaId(desde?.categoriaId ?? null)
    if (!conservarFecha) setFecha(desde?.fecha ?? hoyISO())
    setError('')
  }

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierta && !d.open) {
      reiniciar(gasto)
      d.showModal()
      // Sin esto el foco queda en el botón de cerrar: se pone en el monto para escribir directo
      requestAnimationFrame(() => campoMonto.current?.querySelector('input')?.focus())
    } else if (!abierta && d.open) {
      d.close()
    }
  }, [abierta, gasto])

  // Al editar, la categoría del gasto puede estar archivada: se muestra igual
  const opciones = gasto && !categorias.some((c) => c.id === gasto.categoriaId)
    ? [...categorias, { id: gasto.categoriaId, nombre: gasto.categoriaNombre, color: gasto.categoriaColor, archivada: true, obligatoria: false }]
    : categorias

  async function guardar(e: { preventDefault: () => void }, otro = false) {
    e.preventDefault()
    const valor = parsearMonto(monto)
    if (valor === null) return setError('Escribí un monto mayor a cero, por ejemplo 12.300 o 4.500,50.')
    if (categoriaId === null) return setError('Elegí una categoría.')

    setGuardando(true)
    setError('')
    try {
      const datos = { fecha, monto: valor, moneda, descripcion: descripcion.trim(), categoriaId }
      if (gasto) await api.editarGasto(gasto.id, datos)
      else await api.crearGasto(datos)
      avisar(gasto ? 'Cambios guardados' : 'Gasto guardado')
      if (otro) {
        // Queda abierto para cargar el siguiente, con la misma fecha
        reiniciar(null, true)
        campoMonto.current?.querySelector('input')?.focus()
        alGuardar()
      } else {
        alGuardar()
        alCerrar()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!gasto) return
    const ok = await confirmar({
      titulo: '¿Eliminar este gasto?',
      mensaje: `"${gasto.descripcion || gasto.categoriaNombre}" se borra y deja de contar en el mes.`,
      confirmar: 'Eliminar gasto',
      peligro: true,
    })
    if (!ok) return
    setGuardando(true)
    try {
      await api.eliminarGasto(gasto.id)
      avisar('Gasto eliminado')
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
      // Esc: el navegador cierra el diálogo por su cuenta y a veces no avisa con "close";
      // sin esto la app lo sigue dando por abierto y N deja de funcionar
      onCancel={(e) => { e.preventDefault(); alCerrar() }}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar() }}
      aria-labelledby="hoja-gasto-titulo"
    >
      <form className="dialogo__cuerpo" onSubmit={(e) => guardar(e)} noValidate>
        <div className="dialogo__encabezado">
          <h2 id="hoja-gasto-titulo" className="dialogo__titulo">{gasto ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={campoMonto}>
          <CampoMonto
            id="monto-gasto"
            valor={monto}
            alCambiar={setMonto}
            moneda={moneda}
            alCambiarMoneda={setMoneda}
            autoFocus={!gasto}
          />
        </div>

        <fieldset className="campo">
          <legend className="campo__etiqueta">Categoría</legend>
          {opciones.length === 0 ? (
            <p className="campo__ayuda">Todavía no hay categorías. Creá una en la sección Categorías.</p>
          ) : (
            <div className="chips">
              {opciones.map((c) => (
                <label key={c.id} className="chip">
                  <input
                    type="radio"
                    name="categoria"
                    checked={categoriaId === c.id}
                    onChange={() => setCategoriaId(c.id)}
                  />
                  <span className="chip__punto" style={{ background: c.color }} />
                  {c.nombre}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="campos-en-fila">
          <label className="campo campo--crece">
            <span className="campo__etiqueta">Descripción <span className="campo__opcional">opcional</span></span>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={200}
              placeholder="Súper Coto, nafta, cena…"
            />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="dialogo__acciones">
          {gasto ? (
            <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>
              Eliminar
            </button>
          ) : (
            <button type="button" className="boton boton--fantasma" onClick={(e) => guardar(e, true)} disabled={guardando}>
              Guardar y cargar otro
            </button>
          )}
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : gasto ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
