import { capitalizar, nombreMes } from '../formato'
import { useMes } from '../MesContext'

export function SelectorMes() {
  const { anio, mes, mover, esMesActual } = useMes()
  const anioActual = new Date().getFullYear()

  return (
    <div className="selector-mes">
      <button type="button" className="boton-icono" onClick={() => mover(-1)} aria-label="Mes anterior">
        <Flecha direccion="izquierda" />
      </button>
      <h1 className="selector-mes__titulo" aria-live="polite">
        {capitalizar(nombreMes(mes))}
        {anio !== anioActual && <span className="selector-mes__anio"> {anio}</span>}
      </h1>
      <button
        type="button"
        className="boton-icono"
        onClick={() => mover(1)}
        disabled={esMesActual}
        aria-label="Mes siguiente"
      >
        <Flecha direccion="derecha" />
      </button>
    </div>
  )
}

function Flecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={direccion === 'izquierda' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
