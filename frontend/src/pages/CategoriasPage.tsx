import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Categoria } from '../types'

const COLORES = [
  '#16a34a', '#0f766e', '#0284c7', '#4f46e5', '#7c3aed',
  '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#64748b',
]

interface Props {
  alCerrarSesion: () => void
}

export function CategoriasPage({ alCerrarSesion }: Props) {
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

      <div className="pie-pagina">
        <button type="button" className="boton boton--secundario" onClick={alCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

interface FormProps {
  categoria?: Categoria
  alTerminar: () => void
  alCancelar: () => void
}

function FormCategoria({ categoria, alTerminar, alCancelar }: FormProps) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [color, setColor] = useState(categoria?.color ?? COLORES[0])
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
          {COLORES.map((c) => (
            <label key={c} className="paleta__opcion" style={{ background: c }}>
              <input
                type="radio"
                name="color"
                checked={color.toLowerCase() === c}
                onChange={() => setColor(c)}
                aria-label={c}
              />
            </label>
          ))}
        </div>
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
