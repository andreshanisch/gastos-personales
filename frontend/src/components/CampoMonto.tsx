import { formatearAlEscribir } from '../formato'
import { alTeclaEnGrupo } from '../teclado'
import type { Moneda } from '../types'

interface Props {
  id: string
  valor: string
  alCambiar: (valor: string) => void
  moneda: Moneda
  alCambiarMoneda: (moneda: Moneda) => void
  autoFocus?: boolean
}

/** Campo grande para el monto, con selector de moneda y puntos de miles mientras se escribe. */
export function CampoMonto({ id, valor, alCambiar, moneda, alCambiarMoneda, autoFocus }: Props) {
  return (
    <div className="campo-monto">
      <div className="segmentado segmentado--chico" role="radiogroup" aria-label="Moneda" onKeyDown={alTeclaEnGrupo}>
        {(['ARS', 'USD'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={moneda === m}
            tabIndex={moneda === m ? 0 : -1}
            className="segmentado__opcion"
            onClick={() => alCambiarMoneda(m)}
          >
            {m === 'ARS' ? '$' : 'US$'}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={id}>Monto</label>
      <input
        id={id}
        className="campo-monto__input"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={valor}
        onChange={(e) => alCambiar(formatearAlEscribir(e.target.value))}
        autoFocus={autoFocus}
      />
    </div>
  )
}
