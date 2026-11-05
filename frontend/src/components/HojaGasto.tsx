import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { api } from '../api'
import { fechaCorta, fechaLarga, formatearMonto, hoyISO, interpretarFecha, montoParaEditar, parsearMonto, sumarDias } from '../formato'
import { saldoDeEstaSemana } from '../semana'
import type { Categoria, Gasto, Moneda } from '../types'
import { useAvisos } from './Avisos'
import { CampoMonto } from './CampoMonto'
import { useConfirmar } from './Confirmar'
import { Monto } from './Monto'

interface Props {
  abierta: boolean
  gasto: Gasto | null // null = gasto nuevo
  categorias: Categoria[]
  alCerrar: () => void
  alGuardar: () => void
}

/** Para comparar iniciales sin importar mayúsculas ni tildes: "Ómnibus" empieza con "o" */
const sinTildes = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Diálogo para cargar o editar un gasto. Pensado para cargar muchos seguidos:
 * Enter guarda y deja el diálogo listo para el siguiente, Ctrl+Enter guarda y cierra.
 */
export function HojaGasto({ abierta, gasto, categorias, alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const campoMonto = useRef<HTMLDivElement>(null)
  const chips = useRef<HTMLDivElement>(null)
  const avisar = useAvisos()
  const confirmar = useConfirmar()
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaTexto, setFechaTexto] = useState(fechaCorta(hoyISO()))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  // Lo que queda esta semana según el Plan, y lo cargado desde que se abrió el diálogo
  const [saldoSemana, setSaldoSemana] = useState<number | null>(null)
  const [tanda, setTanda] = useState({ cantidad: 0, pesos: 0 })

  const fechaValida = interpretarFecha(fechaTexto, fecha)

  function ponerFecha(nueva: string) {
    setFecha(nueva)
    setFechaTexto(fechaCorta(nueva))
  }

  function reiniciar(desde: Gasto | null, conservarFecha = false) {
    setMonto(desde ? montoParaEditar(desde.monto) : '')
    setMoneda(desde?.moneda ?? 'ARS')
    setDescripcion(desde?.descripcion ?? '')
    setCategoriaId(desde?.categoriaId ?? null)
    if (!conservarFecha) ponerFecha(desde?.fecha ?? hoyISO())
    setError('')
  }

  function actualizarSaldo() {
    saldoDeEstaSemana().then(setSaldoSemana).catch(() => setSaldoSemana(null))
  }

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierta && !d.open) {
      reiniciar(gasto)
      setTanda({ cantidad: 0, pesos: 0 })
      setSaldoSemana(null)
      if (!gasto) actualizarSaldo()
      d.showModal()
      // Sin esto el foco queda en el botón de cerrar: se pone en el monto para escribir directo
      requestAnimationFrame(() => campoMonto.current?.querySelector('input')?.focus())
    } else if (!abierta && d.open) {
      // Si el foco quedó en un campo del diálogo, se suelta: si no, los atajos N e I creen que se está escribiendo
      if (d.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
      d.close()
    }
  }, [abierta, gasto])

  // Al editar, la categoría del gasto puede estar archivada: se muestra igual
  const opciones = gasto && !categorias.some((c) => c.id === gasto.categoriaId)
    ? [...categorias, { id: gasto.categoriaId, nombre: gasto.categoriaNombre, color: gasto.categoriaColor, archivada: true, obligatoria: false }]
    : categorias

  async function guardar(seguir: boolean) {
    const valor = parsearMonto(monto)
    if (valor === null) return setError('Escribí un monto mayor a cero, por ejemplo 12.300 o 4.500,50.')
    if (categoriaId === null) return setError('Elegí una categoría.')
    if (!fechaValida) return setError('No entiendo la fecha: escribí el día, por ejemplo 12, o el día y el mes, como 12/10.')

    setGuardando(true)
    setError('')
    try {
      const datos = { fecha: fechaValida, monto: valor, moneda, descripcion: descripcion.trim(), categoriaId }
      if (gasto) await api.editarGasto(gasto.id, datos)
      else await api.crearGasto(datos)
      const categoria = opciones.find((c) => c.id === categoriaId)?.nombre
      avisar(gasto ? 'Cambios guardados' : `Guardado: ${formatearMonto(valor, moneda)} en ${categoria}`)
      alGuardar()
      if (seguir) {
        // Queda abierto para cargar el siguiente, con la misma fecha
        setTanda((t) => ({ cantidad: t.cantidad + 1, pesos: t.pesos + (moneda === 'ARS' ? valor : 0) }))
        reiniciar(null, true)
        ponerFecha(fechaValida)
        actualizarSaldo()
        campoMonto.current?.querySelector('input')?.focus()
      } else {
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

  // Enter guarda (y sigue si es un gasto nuevo); Ctrl+Enter guarda y cierra.
  // Se maneja acá y no con el submit del formulario para que también funcione con el foco en una categoría.
  function alTeclaFormulario(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey) return
    if ((e.target as HTMLElement).closest('button')) return // Enter sobre un botón hace lo de ese botón
    e.preventDefault()
    if (guardando) return
    guardar(!gasto && !(e.ctrlKey || e.metaKey))
  }

  // Con el foco en las categorías, una letra salta a la siguiente que empieza con esa letra
  function alTeclaCategorias(e: KeyboardEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || !/\p{L}/u.test(e.key)) return
    const letra = sinTildes(e.key)
    const desde = opciones.findIndex((c) => c.id === categoriaId)
    for (let paso = 1; paso <= opciones.length; paso++) {
      const c = opciones[(desde + paso) % opciones.length]
      if (sinTildes(c.nombre).startsWith(letra)) {
        e.preventDefault()
        setCategoriaId(c.id)
        chips.current?.querySelector<HTMLInputElement>(`input[value="${c.id}"]`)?.focus()
        return
      }
    }
  }

  // Flechas arriba y abajo en la fecha: un día más o menos
  function alTeclaFecha(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    ponerFecha(sumarDias(fechaValida ?? fecha, e.key === 'ArrowUp' ? 1 : -1))
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
      <form className="dialogo__cuerpo" onSubmit={(e) => { e.preventDefault(); guardar(!gasto) }} onKeyDown={alTeclaFormulario} noValidate>
        <div className="dialogo__encabezado">
          <div>
            <h2 id="hoja-gasto-titulo" className="dialogo__titulo">{gasto ? 'Editar gasto' : 'Nuevo gasto'}</h2>
            {!gasto && (saldoSemana !== null || tanda.cantidad > 0) && (
              <p className="dialogo__resumen" aria-live="polite">
                {saldoSemana !== null && (
                  saldoSemana >= 0
                    ? <>Esta semana te quedan <Monto valor={saldoSemana} /></>
                    : <span className="dialogo__resumen--excedido">Esta semana te pasaste por <Monto valor={-saldoSemana} /></span>
                )}
                {saldoSemana !== null && tanda.cantidad > 0 && ' · '}
                {tanda.cantidad > 0 && (
                  <>
                    Cargaste {tanda.cantidad === 1 ? '1 gasto' : `${tanda.cantidad} gastos`}
                    {tanda.pesos > 0 && <> (<Monto valor={tanda.pesos} />)</>}
                  </>
                )}
              </p>
            )}
          </div>
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
          <legend className="campo__etiqueta">
            Categoría <span className="campo__opcional solo-teclado">escribí la inicial para saltar</span>
          </legend>
          {opciones.length === 0 ? (
            <p className="campo__ayuda">Todavía no hay categorías. Creá una en la sección Categorías.</p>
          ) : (
            <div className="chips" ref={chips} onKeyDown={alTeclaCategorias}>
              {opciones.map((c) => (
                <label key={c.id} className="chip">
                  <input
                    type="radio"
                    name="categoria"
                    value={c.id}
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
          <label className="campo campo--fecha">
            <span className="campo__etiqueta">Fecha</span>
            <input
              value={fechaTexto}
              onChange={(e) => {
                setFechaTexto(e.target.value)
                const nueva = interpretarFecha(e.target.value, fecha)
                if (nueva) setFecha(nueva)
              }}
              onKeyDown={alTeclaFecha}
              onBlur={() => { if (fechaValida) setFechaTexto(fechaCorta(fechaValida)) }}
              inputMode="numeric"
              autoComplete="off"
              aria-describedby="fecha-gasto-ayuda"
              aria-invalid={!fechaValida}
            />
            <span className={`campo__ayuda ${fechaValida ? '' : 'campo__ayuda--error'}`} id="fecha-gasto-ayuda">
              {fechaValida ? fechaLarga(fechaValida) : 'Escribí el día, o día/mes'}
            </span>
          </label>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="dialogo__acciones">
          {gasto ? (
            <>
              <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>
                Eliminar
              </button>
              <button type="submit" className="boton boton--primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="boton boton--secundario" onClick={() => guardar(false)} disabled={guardando}>
                Guardar y cerrar
                <kbd>Ctrl+Enter</kbd>
              </button>
              <button type="submit" className="boton boton--primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar y seguir'}
                <kbd>Enter</kbd>
              </button>
            </>
          )}
        </div>
      </form>
    </dialog>
  )
}
