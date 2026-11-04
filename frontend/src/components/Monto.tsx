import { formatearMonto } from '../formato'
import type { Moneda } from '../types'

interface Props {
  valor: number
  moneda?: Moneda
  /** Muestra el signo menos si el valor es negativo (por defecto muestra el valor absoluto) */
  conSigno?: boolean
  className?: string
}

/**
 * Monto con el símbolo de la moneda más chico y liviano que el número,
 * para que lo que se lea primero sea la cifra.
 */
export function Monto({ valor, moneda = 'ARS', conSigno = false, className = '' }: Props) {
  const redondeado = moneda === 'ARS' ? Math.round(valor) : valor
  const texto = formatearMonto(Math.abs(redondeado), moneda)
  // "$ 12.300" o "USD 7,99": se separa el símbolo del número
  const [simbolo, ...resto] = texto.split(/\s/)
  const numero = resto.join(' ')
  const negativo = conSigno && redondeado < 0
  return (
    <span className={`monto ${className}`}>
      {negativo && <span className="monto__signo">−</span>}
      <span className="monto__simbolo">{simbolo}</span>
      <span className="monto__numero">{numero || simbolo}</span>
    </span>
  )
}
