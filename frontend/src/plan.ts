/**
 * Cálculo del plan semanal de gastos.
 *
 * Reglas:
 * - El mes se divide en 4 semanas: días 1-7, 8-14, 15-21 y 22 a fin de mes.
 * - Primero se reserva el monto estimado de cada categoría obligatoria. La reserva se toma de
 *   los primeros ingresos del mes (por fecha).
 * - Lo que queda libre de cada ingreso se reparte en partes iguales desde la semana en que entra
 *   hasta la semana 4. Así, un ingreso del día 15 solo suma a las semanas 3 y 4.
 * - Cada semana tiene un monto fijo. Si se gasta de más, el exceso se descuenta en partes iguales
 *   de las semanas siguientes (aunque la semana todavía no haya terminado, porque ya se gastó).
 * - Si a una semana terminada le sobra plata, la persona decide: guardarlo como ahorro o
 *   repartirlo entre las semanas que quedan. Mientras no decide, ese sobrante queda apartado.
 * - Los gastos de categorías obligatorias se descuentan de su reserva. Si una supera lo estimado,
 *   la diferencia cuenta como gasto común de la semana en que ocurrió.
 * - Solo se consideran montos en pesos.
 */

export type Decision = 'Ahorrar' | 'Repartir'
export type EstadoSemana = 'terminada' | 'en-curso' | 'proxima'

export interface MovimientoPlan {
  fecha: string // yyyy-MM-dd, dentro del mes
  monto: number
}

export interface GastoPlan extends MovimientoPlan {
  categoriaId: number
}

export interface EntradaPlan {
  anio: number
  mes: number
  /** Fecha de hoy (yyyy-MM-dd), para saber qué semanas terminaron */
  hoy: string
  ingresos: MovimientoPlan[]
  gastos: GastoPlan[]
  /** Categoría obligatoria -> monto estimado para el mes */
  obligatorias: Map<number, number>
  /** Semana -> qué hacer con su sobrante */
  decisiones: Map<number, Decision>
}

export interface SemanaPlan {
  numero: 1 | 2 | 3 | 4
  desde: number // día del mes
  hasta: number
  estado: EstadoSemana
  /** Lo que le toca por los ingresos, sin ajustes */
  base: number
  /** Ajuste por excesos (negativo) o sobrantes repartidos (positivo) de semanas anteriores */
  ajuste: number
  asignado: number
  gastado: number
  /** asignado - gastado */
  saldo: number
  /** Suma de lo asignado desde el día 1 hasta el final de esta semana */
  acumulado: number
  /** Si sobró plata en una semana terminada y la persona no eligió qué hacer */
  decisionPendiente: boolean
  decision: Decision | null
  /** Si gastó de más, cuánto se descuenta de cada semana siguiente */
  descuentoPorSemanaSiguiente: number
}

export interface ObligatoriaPlan {
  categoriaId: number
  estimado: number
  pagado: number
  /** Lo pagado por encima de lo estimado (cuenta como gasto común) */
  excedente: number
}

export interface ResultadoPlan {
  semanas: SemanaPlan[]
  ingresos: number
  reservaObligatorios: number
  /** Parte de los obligatorios que los ingresos del mes no alcanzan a cubrir */
  obligatoriosSinCubrir: number
  /** Ingresos menos reserva de obligatorios */
  libre: number
  ahorrado: number
  /** Sobrantes de semanas terminadas que esperan una decisión */
  apartado: number
  /** Exceso de la última semana, que ya no se puede descontar de ninguna */
  excesoSinCubrir: number
  obligatorias: ObligatoriaPlan[]
  /** Semana en curso (1 a 4) si el mes es el actual; si no, null */
  semanaActual: number | null
}

const centavos = (n: number) => Math.round(n * 100) / 100

export function rangosDelMes(anio: number, mes: number) {
  const ultimo = new Date(anio, mes, 0).getDate()
  return [
    { numero: 1 as const, desde: 1, hasta: 7 },
    { numero: 2 as const, desde: 8, hasta: 14 },
    { numero: 3 as const, desde: 15, hasta: 21 },
    { numero: 4 as const, desde: 22, hasta: ultimo },
  ]
}

export function semanaDelDia(dia: number): 1 | 2 | 3 | 4 {
  if (dia <= 7) return 1
  if (dia <= 14) return 2
  if (dia <= 21) return 3
  return 4
}

const dia = (fechaISO: string) => Number(fechaISO.slice(8, 10))

export function calcularPlan(e: EntradaPlan): ResultadoPlan {
  const rangos = rangosDelMes(e.anio, e.mes)
  const clave = (a: number, m: number) => a * 100 + m
  const [hoyA, hoyM, hoyD] = e.hoy.split('-').map(Number)
  const mesHoy = clave(hoyA, hoyM)
  const mesPlan = clave(e.anio, e.mes)

  const estadoDe = (desde: number, hasta: number): EstadoSemana => {
    if (mesPlan < mesHoy) return 'terminada'
    if (mesPlan > mesHoy) return 'proxima'
    if (hoyD > hasta) return 'terminada'
    if (hoyD >= desde) return 'en-curso'
    return 'proxima'
  }

  // ---------- 1. Ingresos por semana y reserva de obligatorios ----------
  const ingresoSemana = [0, 0, 0, 0, 0] // índice 1..4
  for (const i of e.ingresos) ingresoSemana[semanaDelDia(dia(i.fecha))] += i.monto
  const ingresos = ingresoSemana.reduce((s, v) => s + v, 0)

  const reservaObligatorios = [...e.obligatorias.values()].reduce((s, v) => s + Math.max(0, v), 0)
  let porReservar = reservaObligatorios
  const libreSemana = [0, 0, 0, 0, 0]
  for (let w = 1; w <= 4; w++) {
    const usado = Math.min(porReservar, ingresoSemana[w])
    libreSemana[w] = ingresoSemana[w] - usado
    porReservar -= usado
  }

  // ---------- 2. Monto base de cada semana ----------
  // Lo libre de un ingreso de la semana w se reparte entre las semanas w..4
  const base = [0, 0, 0, 0, 0]
  for (let w = 1; w <= 4; w++) {
    const parte = libreSemana[w] / (5 - w)
    for (let k = w; k <= 4; k++) base[k] += parte
  }

  // ---------- 3. Gasto común por semana ----------
  const gastadoSemana = [0, 0, 0, 0, 0]
  const pagadoObligatoria = new Map<number, number>()
  const ordenados = [...e.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  for (const g of ordenados) {
    const semana = semanaDelDia(dia(g.fecha))
    const estimado = e.obligatorias.get(g.categoriaId)
    if (estimado === undefined) {
      gastadoSemana[semana] += g.monto
      continue
    }
    const pagadoAntes = pagadoObligatoria.get(g.categoriaId) ?? 0
    const disponibleReserva = Math.max(0, estimado - pagadoAntes)
    const excedente = Math.max(0, g.monto - disponibleReserva)
    gastadoSemana[semana] += excedente
    pagadoObligatoria.set(g.categoriaId, pagadoAntes + g.monto)
  }

  // ---------- 4. Semanas con montos fijos, excesos y sobrantes ----------
  const ajuste = [0, 0, 0, 0, 0]
  let ahorrado = 0
  let apartado = 0
  let excesoSinCubrir = 0
  let acumulado = 0
  const semanas: SemanaPlan[] = []

  for (const r of rangos) {
    const k = r.numero
    const asignado = base[k] + ajuste[k]
    const gastado = gastadoSemana[k]
    const saldo = asignado - gastado
    const estado = estadoDe(r.desde, r.hasta)
    const restantes = 4 - k
    let descuentoPorSemanaSiguiente = 0
    let decisionPendiente = false
    const decision = e.decisiones.get(k) ?? null
    acumulado += asignado

    if (saldo < 0) {
      // Gastó de más: se descuenta de las semanas que quedan
      if (restantes > 0) {
        descuentoPorSemanaSiguiente = -saldo / restantes
        for (let j = k + 1; j <= 4; j++) ajuste[j] -= descuentoPorSemanaSiguiente
      } else {
        excesoSinCubrir = -saldo
      }
    } else if (saldo > 0 && estado === 'terminada') {
      if (decision === 'Ahorrar') {
        ahorrado += saldo
      } else if (decision === 'Repartir' && restantes > 0) {
        for (let j = k + 1; j <= 4; j++) ajuste[j] += saldo / restantes
      } else {
        decisionPendiente = true
        apartado += saldo
      }
    }

    semanas.push({
      numero: k,
      desde: r.desde,
      hasta: r.hasta,
      estado,
      base: centavos(base[k]),
      ajuste: centavos(ajuste[k]),
      asignado: centavos(asignado),
      gastado: centavos(gastado),
      saldo: centavos(saldo),
      acumulado: centavos(acumulado),
      decisionPendiente,
      decision,
      descuentoPorSemanaSiguiente: centavos(descuentoPorSemanaSiguiente),
    })
  }

  const obligatorias: ObligatoriaPlan[] = [...e.obligatorias.entries()].map(([categoriaId, estimado]) => {
    const pagado = pagadoObligatoria.get(categoriaId) ?? 0
    return {
      categoriaId,
      estimado,
      pagado: centavos(pagado),
      excedente: centavos(Math.max(0, pagado - estimado)),
    }
  })

  return {
    semanas,
    ingresos: centavos(ingresos),
    reservaObligatorios: centavos(reservaObligatorios),
    obligatoriosSinCubrir: centavos(porReservar),
    libre: centavos(Math.max(0, ingresos - reservaObligatorios)),
    ahorrado: centavos(ahorrado),
    apartado: centavos(apartado),
    excesoSinCubrir: centavos(excesoSinCubrir),
    obligatorias,
    semanaActual: mesPlan === mesHoy ? semanaDelDia(hoyD) : null,
  }
}
