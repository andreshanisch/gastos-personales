import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { useConfirmar } from '../components/Confirmar'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import type { Categoria } from '../types'

// Ordenados por tono; los claros y oscuros se distinguen bien de los intermedios
const COLORES = [
  '#dc2626', // rojo
  '#881337', // bordó
  '#f9a8d4', // rosa claro
  '#db2777', // fucsia
  '#c4b5fd', // lavanda
  '#7c3aed', // violeta
  '#4f46e5', // índigo
  '#0284c7', // azul
  '#67e8f9', // celeste
  '#0f766e', // verde azulado
  '#16a34a', // verde
  '#a3e635', // lima
  '#facc15', // amarillo
  '#ca8a04', // mostaza
  '#ea580c', // naranja
  '#92400e', // marrón
  '#64748b', // gris
]

export function CategoriasPage() {
  const { refrescar } = useAcciones()
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [editando, setEditando] = useState<Categoria | 'nueva' | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      setCategorias(await api.categorias(true))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const activas = categorias?.filter((c) => !c.archivada) ?? []
  const archivadas = categorias?.filter((c) => c.archivada) ?? []

  function terminar() {
    setEditando(null)
    cargar()
    refrescar()
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Categorías"
        subtitulo="Cómo agrupás tus gastos. Las obligatorias se descuentan primero en el plan."
        acciones={
          <button type="button" className="boton boton--primario boton--chico" onClick={() => setEditando('nueva')}>
            Nueva categoría
          </button>
        }
      />

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}
      {!categorias && !error && <Esqueleto filas={3} conTitular={false} />}

      {categorias && activas.length === 0 && (
        <div className="vacio">
          <h2 className="vacio__titulo">Todavía no hay categorías</h2>
          <p className="vacio__texto">Creá una para empezar a cargar gastos, por ejemplo "Supermercado" o "Transporte".</p>
        </div>
      )}

      <ul className="categorias-grilla">
        {activas.map((c) => (
          <li key={c.id}>
            <TarjetaCategoria categoria={c} alEditar={() => setEditando(c)} />
          </li>
        ))}
      </ul>

      {archivadas.length > 0 && (
        <section className="seccion">
          <button type="button" className="boton-texto" onClick={() => setVerArchivadas((v) => !v)} aria-expanded={verArchivadas}>
            {verArchivadas ? 'Ocultar archivadas' : `Ver archivadas (${archivadas.length})`}
          </button>
          {verArchivadas && (
            <>
              <p className="panel__ayuda" style={{ margin: '8px 0 14px' }}>
                Se archivan las categorías que se eliminan y tienen gastos, para no perder el historial.
              </p>
              <ul className="categorias-grilla">
                {archivadas.map((c) => (
                  <li key={c.id}>
                    <TarjetaCategoria categoria={c} alEditar={() => setEditando(c)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <DialogoCategoria
        abierto={editando !== null}
        categoria={editando === 'nueva' ? null : editando}
        otras={(categorias ?? []).filter((o) => editando === 'nueva' || o.id !== editando?.id)}
        alCerrar={() => setEditando(null)}
        alTerminar={terminar}
      />
    </>
  )
}

function TarjetaCategoria({ categoria: c, alEditar }: { categoria: Categoria; alEditar: () => void }) {
  return (
    <button
      type="button"
      className={`categoria-tarjeta ${c.archivada ? 'categoria-tarjeta--archivada' : ''}`}
      style={{ '--color-categoria': c.color } as CSSProperties}
      onClick={alEditar}
    >
      <span className="categoria-tarjeta__nombre">{c.nombre}</span>
      <span className="categoria-tarjeta__etiquetas">
        {c.obligatoria && <span className="etiqueta etiqueta--obligatoria">Obligatoria</span>}
        {c.archivada && <span className="etiqueta" style={{ marginLeft: 0 }}>Archivada</span>}
      </span>
      <span className="categoria-tarjeta__accion">Editar</span>
    </button>
  )
}

interface DialogoProps {
  abierto: boolean
  categoria: Categoria | null // null = nueva
  /** Las demás categorías, para marcar qué colores ya están en uso */
  otras: Categoria[]
  alCerrar: () => void
  alTerminar: () => void
}

function DialogoCategoria({ abierto, categoria, otras, alCerrar, alTerminar }: DialogoProps) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const avisar = useAvisos()
  const confirmar = useConfirmar()
  // Color -> nombre de la categoría que ya lo usa
  const enUso = new Map(otras.filter((o) => !o.archivada).map((o) => [o.color.toLowerCase(), o.nombre]))
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(COLORES[0])
  const [obligatoria, setObligatoria] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) {
      const primerLibre = COLORES.find((c) => !enUso.has(c)) ?? COLORES[0]
      setNombre(categoria?.nombre ?? '')
      setColor(categoria?.color ?? primerLibre)
      setObligatoria(categoria?.obligatoria ?? false)
      setError('')
      setGuardando(false)
      d.showModal()
      requestAnimationFrame(() => (d.querySelector('input:not([type])') as HTMLInputElement | null)?.focus())
    } else if (!abierto && d.open) {
      d.close()
    }
    // enUso se recalcula en cada render; solo importa al abrir
  }, [abierto, categoria])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribí un nombre.')
    setGuardando(true)
    setError('')
    try {
      const datos = { nombre: nombre.trim(), color, archivada: categoria?.archivada ?? false }
      const guardada = categoria ? await api.editarCategoria(categoria.id, datos) : await api.crearCategoria(datos)
      if (guardada.obligatoria !== obligatoria) await api.marcarObligatoria(guardada.id, obligatoria)
      avisar(categoria ? 'Categoría actualizada' : 'Categoría creada')
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!categoria) return
    const ok = await confirmar({
      titulo: `¿Eliminar "${categoria.nombre}"?`,
      mensaje: 'Si tiene gastos, se archiva y sus gastos se conservan. Si no tiene, se borra.',
      confirmar: 'Eliminar categoría',
      peligro: true,
    })
    if (!ok) return
    setGuardando(true)
    try {
      await api.eliminarCategoria(categoria.id)
      avisar('Categoría eliminada')
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  async function restaurar() {
    if (!categoria) return
    setGuardando(true)
    try {
      await api.editarCategoria(categoria.id, { nombre: categoria.nombre, color: categoria.color, archivada: false })
      avisar('Categoría restaurada')
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  const choca = enUso.get(color.toLowerCase())

  return (
    <dialog
      ref={dialogo}
      className="dialogo dialogo--hoja"
      onClose={alCerrar}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar() }}
      aria-labelledby="dialogo-categoria-titulo"
    >
      <form className="dialogo__cuerpo" onSubmit={guardar} noValidate>
        <div className="dialogo__encabezado">
          <h2 id="dialogo-categoria-titulo" className="dialogo__titulo">{categoria ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label className="campo">
          <span className="campo__etiqueta">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Supermercado, transporte…" autoFocus />
        </label>

        <fieldset className="campo">
          <legend className="campo__etiqueta">Color</legend>
          <div className="paleta">
            {COLORES.map((c) => {
              const usadoPor = enUso.get(c)
              return (
                <label
                  key={c}
                  className={`paleta__opcion ${usadoPor ? 'paleta__opcion--usada' : ''}`}
                  style={{ background: c }}
                  title={usadoPor ? `Ya lo usa "${usadoPor}"` : 'Libre'}
                >
                  <input
                    type="radio"
                    name="color"
                    checked={color.toLowerCase() === c}
                    onChange={() => setColor(c)}
                    aria-label={usadoPor ? `${c}, ya lo usa ${usadoPor}` : `${c}, libre`}
                  />
                </label>
              )
            })}
          </div>
          <span className="campo__ayuda">
            {choca
              ? `Este color ya lo usa "${choca}": en las barras no se van a poder distinguir.`
              : 'Los colores con un punto blanco ya los usa otra categoría.'}
          </span>
        </fieldset>

        <label className="interruptor">
          <input type="checkbox" checked={obligatoria} onChange={(e) => setObligatoria(e.target.checked)} />
          <span className="interruptor__pista" aria-hidden="true" />
          <span className="interruptor__texto">
            <span>Es un gasto obligatorio</span>
            <small>Alquiler, servicios, tarjeta, suscripciones. El plan los descuenta antes de repartir.</small>
          </span>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="dialogo__acciones">
          {categoria && !categoria.archivada && (
            <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>Eliminar</button>
          )}
          {categoria?.archivada && (
            <button type="button" className="boton boton--secundario" onClick={restaurar} disabled={guardando}>Restaurar</button>
          )}
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
