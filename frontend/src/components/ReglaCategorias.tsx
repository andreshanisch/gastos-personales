import type { TotalPorCategoria } from '../types'

/** Barra horizontal dividida por categoría según cuánto se gastó en pesos en cada una. */
export function ReglaCategorias({ categorias }: { categorias: TotalPorCategoria[] }) {
  const conPesos = categorias.filter((c) => c.totalARS > 0)
  const total = conPesos.reduce((suma, c) => suma + c.totalARS, 0)

  if (total === 0) return <div className="regla regla--vacia" aria-hidden="true" />

  return (
    <div
      className="regla"
      role="img"
      aria-label={conPesos
        .map((c) => `${c.nombre}: ${Math.round((c.totalARS / total) * 100)}%`)
        .join(', ')}
    >
      {conPesos.map((c) => (
        <span
          key={c.categoriaId}
          className="regla__tramo"
          style={{ flexGrow: c.totalARS, background: c.color }}
          title={c.nombre}
        />
      ))}
    </div>
  )
}
