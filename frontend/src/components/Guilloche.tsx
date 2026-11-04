/**
 * Líneas onduladas superpuestas, como el grabado de seguridad de un billete (guilloche).
 * Es el único adorno de la app: va de fondo en la tarjeta principal del Plan.
 */

const ANCHO = 640
const ALTO = 280

function onda(k: number): string {
  const puntos: string[] = []
  for (let x = 0; x <= ANCHO; x += 8) {
    const envolvente = Math.cos(x * 0.0062 + k * 0.11)
    const y = ALTO / 2 + 92 * Math.sin(x * 0.0175 + k * 0.33) * envolvente + (k - 11) * 3.2
    puntos.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`)
  }
  return puntos.join(' ')
}

/** Roseta: curva cerrada tipo hipotrocoide, centrada a la derecha */
function roseta(radio: number, vueltas: number, profundidad: number): string {
  const cx = ANCHO * 0.84
  const cy = ALTO * 0.5
  const puntos: string[] = []
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2
    const r = radio + profundidad * Math.cos(vueltas * t)
    puntos.push(`${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`)
  }
  return puntos.join(' ') + ' Z'
}

const ONDAS = Array.from({ length: 22 }, (_, k) => onda(k))
const ROSETAS = [
  roseta(118, 18, 14), roseta(104, 18, 14), roseta(90, 24, 10), roseta(76, 24, 10), roseta(62, 30, 7),
]

export function Guilloche() {
  return (
    <svg className="billete__guilloche" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {ONDAS.map((d, i) => <path key={`o${i}`} d={d} />)}
      {ROSETAS.map((d, i) => <path key={`r${i}`} d={d} />)}
    </svg>
  )
}
