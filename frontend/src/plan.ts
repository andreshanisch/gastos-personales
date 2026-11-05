/**
 * Cálculo del plan semanal de gastos.
 *
 * Reglas:
 * - El mes se divide en 4 semanas: días 1-7, 8-14, 15-21 y 22 a fin de mes.
 * - Cada ingreso se reparte en partes iguales desde la semana en que entra hasta la semana 4.
 *   Así, un ingreso del día 15 solo suma a las semanas 3 y 4.
 * - Los gastos obligatorios son los que se cargan en categorías marcadas como obligatorias.
 *   Cada pago se descuenta en partes iguales desde la semana en que se hizo hasta la semana 4;
 *   las semanas anteriores no cambian. Un alquiler pagado el día 1 se reparte entre las 4.
 * - Cada semana tiene un monto fijo. Si se gasta de más, el exceso se descuenta en partes iguales
 *   de las semanas siguientes (aunque la semana todavía no haya terminado, porque ya se gastó).
 * - Si a una semana terminada le sobra plata, la persona decide: guardarlo como ahorro o
 *   repartirlo entre las semanas que quedan. Mientras no decide, ese sobrante queda apartado.
 * - Si una semana se queda sin plata por los obligatorios, lo que falta pasa a la siguiente.
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
  /** Categorías marcadas como obligatorias */
  obligatorias: Set<number>
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
  pagado: number
}

export interface ResultadoPlan {
  semanas: SemanaPlan[]
  ingresos: number
  /** Lo pagado en el mes en categorías obligatorias */
  obligatoriosPagados: number
  /** Parte de los obligatorios que los ingresos del mes no alcanzan a cubrir */
  obligatoriosSinCubrir: number
  /** Ingresos menos obligatorios pagados */
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

  // ---------- 1. Ingresos, obligatorios y gasto común por semana ----------
  const ingresoSemana = [0, 0, 0, 0, 0] // índice 1..4
  for (const i of e.ingresos) ingresoSemana[semanaDelDia(dia(i.fecha))] += i.monto
  const ingresos = ingresoSemana.reduce((s, v) => s + v, 0)

  const obligatorioSemana = [0, 0, 0, 0, 0]
  const gastadoSemana = [0, 0, 0, 0, 0]
  const pagadoObligatoria = new Map<number, number>()
  for (const g of e.gastos) {
    const semana = semanaDelDia(dia(g.fecha))
    if (e.obligatorias.has(g.categoriaId)) {
      obligatorioSemana[semana] += g.monto
      pagadoObligatoria.set(g.categoriaId, (pagadoObligatoria.get(g.categoriaId) ?? 0) + g.monto)
    } else {
      gastadoSemana[semana] += g.monto
    }
  }
  const obligatoriosPagados = obligatorioSemana.reduce((s, v) => s + v, 0)

  // ---------- 2. Monto base de cada semana ----------
  // Lo que entra (o sale, si es un obligatorio) en la semana w se reparte entre las semanas w..4
  const base = [0, 0, 0, 0, 0]
  for (let w = 1; w <= 4; w++) {
    const parte = (ingresoSemana[w] - obligatorioSemana[w]) / (5 - w)
    for (let k = w; k <= 4; k++) base[k] += parte
  }
  // Una semana no puede quedar con monto negativo: lo que falta pasa a la siguiente
  let faltante = 0
  for (let k = 1; k <= 4; k++) {
    base[k] -= faltante
    faltante = 0
    if (base[k] < 0) {
      faltante = -base[k]
      base[k] = 0
    }
  }
  const obligatoriosSinCubrir = faltante

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

  const obligatorias: ObligatoriaPlan[] = [...e.obligatorias].map((categoriaId) => ({
    categoriaId,
    pagado: centavos(pagadoObligatoria.get(categoriaId) ?? 0),
  }))

  return {
    semanas,
    ingresos: centavos(ingresos),
    obligatoriosPagados: centavos(obligatoriosPagados),
    obligatoriosSinCubrir: centavos(obligatoriosSinCubrir),
    libre: centavos(Math.max(0, ingresos - obligatoriosPagados)),
    ahorrado: centavos(ahorrado),
    apartado: centavos(apartado),
    excesoSinCubrir: centavos(excesoSinCubrir),
    obligatorias,
    semanaActual: mesPlan === mesHoy ? semanaDelDia(hoyD) : null,
  }
}

// ---------------------------------------------------------------------------------------------
// "Lo que tengo hoy, en N semanas"
// ---------------------------------------------------------------------------------------------

export interface ResultadoDesdeHoy {
  /** Semanas que se pueden elegir: desde la actual hasta la 4 */
  maximoSemanas: number
  semanasElegidas: number
  /** Ingresos con fecha hasta hoy */
  cobrado: number
  obligatoriosPagados: number
  /** Gastos comunes de las semanas anteriores a la actual */
  gastadoAntes: number
  ahorrado: number
  /** Lo que queda al empezar la semana actual: cobrado - obligatorios - gastado antes - ahorrado */
  disponible: number
  semanas: SemanaPlan[]
  /** Último día cubierto; después de esa fecha no hay plata asignada */
  cubreHasta: number
  /** Ingresos con fecha posterior a hoy, que no se cuentan */
  porCobrar: number
}

/**
 * Reparte la plata que hay hoy en las próximas N semanas, empezando por la actual.
 * No cuenta ingresos que todavía no se cobraron. Lo gastado en la semana actual se muestra
 * como gastado de esa semana (no se resta antes), así se puede seguir como en el plan del mes,
 * y si se pasa, el exceso se descuenta de las semanas elegidas que siguen.
 * Solo tiene sentido para el mes en curso: si no, devuelve null.
 */
export function calcularDesdeHoy(e: EntradaPlan, semanas: number, ahorrado: number): ResultadoDesdeHoy | null {
  const [hoyA, hoyM, hoyD] = e.hoy.split('-').map(Number)
  if (hoyA !== e.anio || hoyM !== e.mes) return null

  const actual = semanaDelDia(hoyD)
  const maximoSemanas = 5 - actual
  const n = Math.min(Math.max(1, Math.round(semanas)), maximoSemanas)
  const rangos = rangosDelMes(e.anio, e.mes)

  let cobrado = 0
  let porCobrar = 0
  for (const i of e.ingresos) {
    if (dia(i.fecha) <= hoyD) cobrado += i.monto
    else porCobrar += i.monto
  }

  let obligatoriosPagados = 0
  let gastadoAntes = 0
  const gastadoSemana = [0, 0, 0, 0, 0]
  for (const g of e.gastos) {
    const semana = semanaDelDia(dia(g.fecha))
    if (e.obligatorias.has(g.categoriaId)) obligatoriosPagados += g.monto
    else if (semana < actual) gastadoAntes += g.monto
    else gastadoSemana[semana] += g.monto
  }

  const disponible = Math.max(0, cobrado - obligatoriosPagados - gastadoAntes - ahorrado)
  const porSemana = disponible / n

  // Igual que en el plan del mes: si una semana se pasa, el exceso se descuenta en partes iguales
  // de las semanas elegidas que quedan
  const ajuste = [0, 0, 0, 0, 0]
  const ultima = actual + n - 1
  let acumulado = 0
  const resultado: SemanaPlan[] = []
  for (let k = actual; k <= ultima; k++) {
    const r = rangos[k - 1]
    const gastado = gastadoSemana[k]
    const asignado = porSemana + ajuste[k]
    const saldo = asignado - gastado
    const restantes = ultima - k
    let descuentoPorSemanaSiguiente = 0
    if (saldo < 0 && restantes > 0) {
      descuentoPorSemanaSiguiente = -saldo / restantes
      for (let j = k + 1; j <= ultima; j++) ajuste[j] -= descuentoPorSemanaSiguiente
    }
    acumulado += asignado
    resultado.push({
      numero: r.numero,
      desde: r.desde,
      hasta: r.hasta,
      estado: k === actual ? 'en-curso' : 'proxima',
      base: centavos(porSemana),
      ajuste: centavos(ajuste[k]),
      asignado: centavos(asignado),
      gastado: centavos(gastado),
      saldo: centavos(saldo),
      acumulado: centavos(acumulado),
      decisionPendiente: false,
      decision: null,
      descuentoPorSemanaSiguiente: centavos(descuentoPorSemanaSiguiente),
    })
  }

  return {
    maximoSemanas,
    semanasElegidas: n,
    cobrado: centavos(cobrado),
    obligatoriosPagados: centavos(obligatoriosPagados),
    gastadoAntes: centavos(gastadoAntes),
    ahorrado: centavos(ahorrado),
    disponible: centavos(disponible),
    semanas: resultado,
    cubreHasta: rangos[actual + n - 2].hasta,
    porCobrar: centavos(porCobrar),
  }
}
