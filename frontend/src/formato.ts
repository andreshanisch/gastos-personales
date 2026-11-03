import type { Moneda } from './types'

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2,
})
const dolares = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'USD', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 2,
})

export function formatearMonto(monto: number, moneda: Moneda = 'ARS') {
  return (moneda === 'USD' ? dolares : pesos).format(monto)
}

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function nombreMes(mes: number) {
  return NOMBRES_MES[mes - 1]
}

export function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** yyyy-MM-dd de hoy, en hora local (no UTC). */
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Hoy", "Ayer" o "Martes 3". */
export function etiquetaDia(fechaISO: string) {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(a, m - 1, d)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diferencia = Math.round((hoy.getTime() - fecha.getTime()) / 86_400_000)
  if (diferencia === 0) return 'Hoy'
  if (diferencia === 1) return 'Ayer'
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long' })
  return `${capitalizar(dia)} ${d}`
}

/**
 * Interpreta montos escritos a la argentina: "12.300", "12300,50", "1.234,5".
 * Con coma: los puntos son miles. Solo con punto: si le siguen 3 dígitos es miles, si no, decimal.
 */
export function parsearMonto(texto: string): number | null {
  let limpio = texto.trim().replace(/\s|\$/g, '')
  if (!limpio) return null

  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    limpio = limpio.replace(/\./g, '')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const valor = Number(limpio)
  return valor > 0 ? valor : null
}
