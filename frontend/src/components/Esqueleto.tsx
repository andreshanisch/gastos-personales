/** Bloques grises que ocupan el lugar del contenido mientras carga. */
export function Esqueleto({ filas = 4, conTitular = true }: { filas?: number; conTitular?: boolean }) {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando">
      {conTitular && (
        <>
          <span className="esqueleto__bloque" style={{ width: '38%', height: 14 }} />
          <span className="esqueleto__bloque" style={{ width: '62%', height: 64, marginBottom: 28 }} />
        </>
      )}
      {Array.from({ length: filas }, (_, i) => (
        <span key={i} className="esqueleto__bloque" style={{ width: `${92 - (i % 3) * 9}%`, height: 44 }} />
      ))}
    </div>
  )
}
