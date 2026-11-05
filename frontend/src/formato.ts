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

/**
 * Formatea lo que se escribe en un campo de monto: puntos de miles automáticos y coma decimal.
 * "12300" -> "12.300", "4500,5" -> "4.500,5". Ignora cualquier otro carácter.
 */
export function formatearAlEscribir(texto: string): string {
  const limpio = texto.replace(/[^\d,]/g, '')
  const [enteros, ...resto] = limpio.split(',')
  const decimales = resto.join('').slice(0, 2)
  const sinCeros = enteros.replace(/^0+(?=\d)/, '')
  const conPuntos = sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return limpio.includes(',') ? `${conPuntos || '0'},${decimales}` : conPuntos
}

/** Monto guardado -> texto para editar: 12300.5 -> "12.300,5" */
export function montoParaEditar(monto: number): string {
  return formatearAlEscribir(String(monto).replace('.', ','))
}

const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/**
 * Interpreta una fecha escrita a mano, tomando lo que falta de `referencia` (yyyy-MM-dd):
 * "12" -> día 12 del mismo mes, "12/10" -> 12 de octubre del mismo año, "12/10/25" o "12/10/2025".
 * También acepta "-" o "." como separador. Devuelve yyyy-MM-dd o null si no es una fecha válida.
 */
export function interpretarFecha(texto: string, referencia: string): string | null {
  const partes = /^(\d{1,2})(?:[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?)?$/.exec(texto.trim())
  if (!partes) return null
  const [anioRef, mesRef] = referencia.split('-').map(Number)
  const dia = Number(partes[1])
  const mes = partes[2] ? Number(partes[2]) : mesRef
  const anio = partes[3] ? (partes[3].length === 2 ? 2000 + Number(partes[3]) : Number(partes[3])) : anioRef
  const fecha = new Date(anio, mes - 1, dia)
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null
  return iso(anio, mes, dia)
}

/** yyyy-MM-dd -> "12/11", o "12/11/2025" si no es del año en curso */
export function fechaCorta(fechaISO: string): string {
  const [a, m, d] = fechaISO.split('-').map(Number)
  return a === new Date().getFullYear() ? `${d}/${m}` : `${d}/${m}/${a}`
}

/** Suma (o resta) días a una fecha yyyy-MM-dd */
export function sumarDias(fechaISO: string, dias: number): string {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(a, m - 1, d + dias)
  return iso(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate())
}

/** yyyy-MM-dd -> "jueves 12 de noviembre" (con el año si no es el actual) */
export function fechaLarga(fechaISO: string): string {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const dia = new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long' })
  return `${dia} ${d} de ${nombreMes(m)}${a === new Date().getFullYear() ? '' : ` de ${a}`}`
}

/** "Noviembre 2026" */
export function nombreMesAnio(anio: number, mes: number) {
  return `${capitalizar(nombreMes(mes))} ${anio}`
}
