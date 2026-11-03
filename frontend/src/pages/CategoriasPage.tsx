import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
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

  const visibles = categorias?.filter((c) => verArchivadas || !c.archivada) ?? []
  const hayArchivadas = categorias?.some((c) => c.archivada) ?? false

  return (
    <>
      <div className="encabezado-pagina">
        <h1>Categorías</h1>
        {editando === null && (
          <button type="button" className="boton boton--secundario" onClick={() => setEditando('nueva')}>
            Nueva categoría
          </button>
        )}
      </div>

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}

      {editando === 'nueva' && (
        <FormCategoria
          otras={categorias ?? []}
          alTerminar={() => { setEditando(null); cargar() }}
          alCancelar={() => setEditando(null)}
        />
      )}

      <ul className="lista-categorias">
        {visibles.map((c) =>
          editando !== 'nueva' && editando?.id === c.id ? (
            <li key={c.id}>
              <FormCategoria
                categoria={c}
                otras={(categorias ?? []).filter((o) => o.id !== c.id)}
                alTerminar={() => { setEditando(null); cargar() }}
                alCancelar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li key={c.id}>
              <button
                type="button"
                className={`categoria ${c.archivada ? 'categoria--archivada' : ''}`}
                onClick={() => setEditando(c)}
              >
                <span className="gasto__punto" style={{ background: c.color }} aria-hidden="true" />
                <span>{c.nombre}</span>
                {c.archivada && <span className="categoria__estado">Archivada</span>}
              </button>
            </li>
          ),
        )}
      </ul>

      {hayArchivadas && (
        <button type="button" className="boton-texto" onClick={() => setVerArchivadas((v) => !v)}>
          {verArchivadas ? 'Ocultar archivadas' : 'Mostrar archivadas'}
        </button>
      )}
    </>
  )
}

interface FormProps {
  categoria?: Categoria
  /** Las demás categorías activas, para marcar qué colores ya están en uso */
  otras: Categoria[]
  alTerminar: () => void
  alCancelar: () => void
}

function FormCategoria({ categoria, otras, alTerminar, alCancelar }: FormProps) {
  // Color -> nombre de la categoría que ya lo usa
  const enUso = new Map(otras.filter((o) => !o.archivada).map((o) => [o.color.toLowerCase(), o.nombre]))
  const primerLibre = COLORES.find((c) => !enUso.has(c)) ?? COLORES[0]
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [color, setColor] = useState(categoria?.color ?? primerLibre)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribí un nombre.')
    setGuardando(true)
    setError('')
    try {
      const datos = { nombre: nombre.trim(), color, archivada: false }
      if (categoria) await api.editarCategoria(categoria.id, datos)
      else await api.crearCategoria(datos)
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!categoria || !confirm(`¿Eliminar "${categoria.nombre}"? Si tiene gastos, se archiva y sus gastos se conservan.`)) return
    setGuardando(true)
    try {
      await api.eliminarCategoria(categoria.id)
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <form className="form-categoria" onSubmit={guardar}>
      <label className="campo">
        <span className="campo__etiqueta">Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoFocus />
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
        {enUso.has(color.toLowerCase()) && (
          <p className="campo__ayuda">
            Este color ya lo usa "{enUso.get(color.toLowerCase())}": en la barra no se van a poder distinguir.
          </p>
        )}
        <p className="campo__ayuda">Los colores con una marca blanca ya están en uso.</p>
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="form-categoria__acciones">
        {categoria && !categoria.archivada && (
          <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={guardando}>
            Eliminar
          </button>
        )}
        {categoria?.archivada && (
          <button
            type="button"
            className="boton boton--secundario"
            disabled={guardando}
            onClick={async () => {
              setGuardando(true)
              try {
                await api.editarCategoria(categoria.id, { nombre: categoria.nombre, color: categoria.color, archivada: false })
                alTerminar()
              } catch (err) {
                setError((err as Error).message)
                setGuardando(false)
              }
            }}
          >
            Restaurar
          </button>
        )}
        <span className="espaciador" />
        <button type="button" className="boton-texto" onClick={alCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={guardando}>
          {categoria ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
    </form>
  )
}
