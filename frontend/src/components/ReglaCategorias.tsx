import type { TotalPorCategoria } from '../types'

interface Props {
  categorias: TotalPorCategoria[]
  /** Ingresos del mes en pesos. Si se pasa, la barra entera representa el ingreso y el resto queda vacío. */
  ingresos?: number
}

/** Barra horizontal dividida por categoría según cuánto se gastó en pesos en cada una. */
export function ReglaCategorias({ categorias, ingresos = 0 }: Props) {
  const conPesos = categorias.filter((c) => c.totalARS > 0)
  const gastado = conPesos.reduce((suma, c) => suma + c.totalARS, 0)
  const escala = Math.max(gastado, ingresos)

  if (escala === 0) return <div className="regla regla--vacia" aria-hidden="true" />

  const disponible = ingresos - gastado
  const descripcion = conPesos
    .map((c) => `${c.nombre}: ${Math.round((c.totalARS / escala) * 100)}%`)
    .concat(disponible > 0 ? [`Disponible: ${Math.round((disponible / escala) * 100)}%`] : [])
    .join(', ')

  return (
    <div className="regla" role="img" aria-label={descripcion}>
      {conPesos.map((c) => (
        <span
          key={c.categoriaId}
          className="regla__tramo"
          style={{ flexGrow: c.totalARS, background: c.color }}
          title={c.nombre}
        />
      ))}
      {disponible > 0 && (
        <span className="regla__tramo regla__tramo--disponible" style={{ flexGrow: disponible }} title="Disponible" />
      )}
    </div>
  )
}
