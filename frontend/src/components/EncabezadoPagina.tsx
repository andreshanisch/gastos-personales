import type { ReactNode } from 'react'
import { nombreMesAnio } from '../formato'
import { useMes } from '../MesContext'

interface Props {
  titulo: string
  subtitulo?: ReactNode
  /** Botones a la derecha del título */
  acciones?: ReactNode
  /** Muestra el selector de mes (páginas que dependen del mes elegido) */
  conMes?: boolean
}

export function EncabezadoPagina({ titulo, subtitulo, acciones, conMes = false }: Props) {
  return (
    <header className="encabezado">
      <div className="encabezado__textos">
        <h1 className="encabezado__titulo">{titulo}</h1>
        {subtitulo && <p className="encabezado__subtitulo">{subtitulo}</p>}
      </div>
      {(acciones || conMes) && (
        <div className="encabezado__acciones">
          {acciones}
          {conMes && <SelectorMes />}
        </div>
      )}
    </header>
  )
}

export function SelectorMes() {
  const { anio, mes, mover, irAHoy, esMesActual } = useMes()
  return (
    <div className="selector-mes" role="group" aria-label="Mes">
      <button type="button" className="selector-mes__flecha" onClick={() => mover(-1)} aria-label="Mes anterior">
        <Flecha direccion="izquierda" />
      </button>
      <span className="selector-mes__nombre" aria-live="polite">{nombreMesAnio(anio, mes)}</span>
      <button
        type="button"
        className="selector-mes__flecha"
        onClick={() => mover(1)}
        disabled={esMesActual}
        aria-label="Mes siguiente"
      >
        <Flecha direccion="derecha" />
      </button>
      {!esMesActual && (
        <button type="button" className="selector-mes__hoy" onClick={irAHoy}>Ir a este mes</button>
      )}
    </div>
  )
}

function Flecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={direccion === 'izquierda' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
