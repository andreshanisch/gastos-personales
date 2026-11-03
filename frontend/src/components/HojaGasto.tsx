import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'
import { hoyISO, parsearMonto } from '../formato'
import type { Categoria, Gasto, Moneda } from '../types'

interface Props {
  abierta: boolean
  gasto: Gasto | null // null = gasto nuevo
  categorias: Categoria[]
  alCerrar: () => void
  alGuardar: () => void
}

/** Panel que sube desde abajo para cargar o editar un gasto. */
export function HojaGasto({ abierta, gasto, categorias, alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierta && !d.open) {
      setMonto(gasto ? String(gasto.monto).replace('.', ',') : '')
      setMoneda(gasto?.moneda ?? 'ARS')
      setDescripcion(gasto?.descripcion ?? '')
      setCategoriaId(gasto?.categoriaId ?? null)
      setFecha(gasto?.fecha ?? hoyISO())
      setError('')
      d.showModal()
    } else if (!abierta && d.open) {
      d.close()
    }
  }, [abierta, gasto])

  // Al editar, la categoría del gasto puede estar archivada: se muestra igual
  const opciones = gasto && !categorias.some((c) => c.id === gasto.categoriaId)
    ? [...categorias, { id: gasto.categoriaId, nombre: gasto.categoriaNombre, color: gasto.categoriaColor, archivada: true }]
    : categorias

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const valor = parsearMonto(monto)
    if (valor === null) return setError('Escribí un monto mayor a cero, por ejemplo 12.300 o 4500,50.')
    if (categoriaId === null) return setError('Elegí una categoría.')

    setGuardando(true)
    setError('')
    try {
      const datos = { fecha, monto: valor, moneda, descripcion: descripcion.trim(), categoriaId }
      if (gasto) await api.editarGasto(gasto.id, datos)
      else await api.crearGasto(datos)
      alGuardar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!gasto || !confirm(`¿Eliminar "${gasto.descripcion || gasto.categoriaNombre}"?`)) return
    setGuardando(true)
    try {
      await api.eliminarGasto(gasto.id)
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
      aria-labelledby="hoja-titulo"
    >
      <form className="hoja__cuerpo" onSubmit={guardar} noValidate>
        <div className="hoja__encabezado">
          <h2 id="hoja-titulo">{gasto ? 'Editar gasto' : 'Nuevo gasto'}</h2>
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
          <label className="sr-only" htmlFor="monto">Monto</label>
          <input
            id="monto"
            className="campo-monto__input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            autoFocus={!gasto}
          />
        </div>

        <label className="campo">
          <span className="campo__etiqueta">Descripción <span className="campo__opcional">(opcional)</span></span>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
            placeholder="Si la dejás vacía, se muestra la categoría"
          />
        </label>

        <fieldset className="campo">
          <legend className="campo__etiqueta">Categoría</legend>
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
        </fieldset>

        <label className="campo">
          <span className="campo__etiqueta">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="hoja__acciones">
          {gasto && (
            <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>
              Eliminar
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
