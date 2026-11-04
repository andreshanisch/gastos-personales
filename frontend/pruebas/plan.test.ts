// Pruebas del cálculo del plan semanal. Se corren con: npm test
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { calcularPlan, type EntradaPlan } from '../src/plan.ts'

const ALQUILER = 1
const SUPER = 2

function entrada(cambios: Partial<EntradaPlan> = {}): EntradaPlan {
  return {
    anio: 2026,
    mes: 11,
    hoy: '2026-11-03',
    ingresos: [{ fecha: '2026-11-01', monto: 800_000 }],
    gastos: [],
    obligatorias: new Map([[ALQUILER, 200_000]]),
    decisiones: new Map(),
    ...cambios,
  }
}

const asignados = (r: ReturnType<typeof calcularPlan>) => r.semanas.map((s) => s.asignado)

test('reserva los obligatorios y reparte el resto en 4 semanas iguales', () => {
  const r = calcularPlan(entrada())
  assert.equal(r.reservaObligatorios, 200_000)
  assert.equal(r.libre, 600_000)
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
  assert.deepEqual(r.semanas.map((s) => s.acumulado), [150_000, 300_000, 450_000, 600_000])
  assert.deepEqual(r.semanas.map((s) => s.estado), ['en-curso', 'proxima', 'proxima', 'proxima'])
  assert.equal(r.semanaActual, 1)
})

test('la semana 4 llega hasta el último día del mes', () => {
  const r = calcularPlan(entrada())
  assert.deepEqual(r.semanas.map((s) => [s.desde, s.hasta]), [[1, 7], [8, 14], [15, 21], [22, 30]])
})

test('un ingreso de mitad de mes solo suma desde su semana en adelante', () => {
  const r = calcularPlan(entrada({
    ingresos: [
      { fecha: '2026-11-01', monto: 400_000 },
      { fecha: '2026-11-15', monto: 400_000 },
    ],
  }))
  // Semana 1: 400.000 - 200.000 de obligatorios = 200.000 libres / 4 = 50.000 por semana
  // Semana 3: 400.000 / 2 semanas = 200.000 más para las semanas 3 y 4
  assert.deepEqual(asignados(r), [50_000, 50_000, 250_000, 250_000])
})

test('si los obligatorios superan el primer ingreso, se cubren con los siguientes', () => {
  const r = calcularPlan(entrada({
    ingresos: [
      { fecha: '2026-11-01', monto: 100_000 },
      { fecha: '2026-11-16', monto: 500_000 },
    ],
    obligatorias: new Map([[ALQUILER, 300_000]]),
  }))
  assert.deepEqual(asignados(r), [0, 0, 150_000, 150_000])
  assert.equal(r.obligatoriosSinCubrir, 0)
})

test('avisa cuando los ingresos no alcanzan para los obligatorios', () => {
  const r = calcularPlan(entrada({
    ingresos: [{ fecha: '2026-11-01', monto: 150_000 }],
  }))
  assert.equal(r.obligatoriosSinCubrir, 50_000)
  assert.deepEqual(asignados(r), [0, 0, 0, 0])
})

test('el exceso de una semana se descuenta en partes iguales de las siguientes', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [{ fecha: '2026-11-05', monto: 180_000, categoriaId: SUPER }],
  }))
  const [s1, s2, s3, s4] = r.semanas
  assert.equal(s1.saldo, -30_000)
  assert.equal(s1.descuentoPorSemanaSiguiente, 10_000)
  assert.deepEqual([s2.asignado, s3.asignado, s4.asignado], [140_000, 140_000, 140_000])
})

test('el exceso se descuenta apenas ocurre, aunque la semana no haya terminado', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-03',
    gastos: [{ fecha: '2026-11-02', monto: 210_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].estado, 'en-curso')
  assert.deepEqual(asignados(r), [150_000, 130_000, 130_000, 130_000])
})

test('el sobrante de una semana terminada espera la decisión y queda apartado', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [{ fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].saldo, 60_000)
  assert.equal(r.semanas[0].decisionPendiente, true)
  assert.equal(r.apartado, 60_000)
  // Mientras no decide, las semanas siguientes no cambian
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
})

test('el sobrante elegido como ahorro no se suma a las semanas siguientes', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [{ fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
    decisiones: new Map([[1, 'Ahorrar']]),
  }))
  assert.equal(r.ahorrado, 60_000)
  assert.equal(r.apartado, 0)
  assert.equal(r.semanas[0].decisionPendiente, false)
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
})

test('el sobrante repartido se suma en partes iguales a las semanas que quedan', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [{ fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
    decisiones: new Map([[1, 'Repartir']]),
  }))
  assert.deepEqual(asignados(r), [150_000, 170_000, 170_000, 170_000])
  assert.equal(r.ahorrado, 0)
})

test('una semana en curso con sobrante todavía no pide decisión', () => {
  const r = calcularPlan(entrada({
    gastos: [{ fecha: '2026-11-02', monto: 10_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].saldo, 140_000)
  assert.equal(r.semanas[0].decisionPendiente, false)
})

test('los gastos obligatorios salen de su reserva y solo el excedente cuenta como gasto común', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-20',
    gastos: [
      { fecha: '2026-11-02', monto: 150_000, categoriaId: ALQUILER },
      { fecha: '2026-11-09', monto: 100_000, categoriaId: ALQUILER },
    ],
  }))
  // 200.000 estimados: el primer pago entra entero, del segundo sobran 50.000 que cuentan en la semana 2
  assert.equal(r.semanas[0].gastado, 0)
  assert.equal(r.semanas[1].gastado, 50_000)
  assert.deepEqual(r.obligatorias, [{ categoriaId: ALQUILER, estimado: 200_000, pagado: 250_000, excedente: 50_000 }])
})

test('el exceso de la última semana queda sin cubrir', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-30',
    gastos: [{ fecha: '2026-11-25', monto: 170_000, categoriaId: SUPER }],
  }))
  assert.equal(r.excesoSinCubrir, 20_000)
})

test('un mes pasado tiene todas las semanas terminadas', () => {
  const r = calcularPlan(entrada({ hoy: '2026-12-05' }))
  assert.deepEqual(r.semanas.map((s) => s.estado), ['terminada', 'terminada', 'terminada', 'terminada'])
  assert.equal(r.semanaActual, null)
  // Todas sobraron y nadie decidió: queda todo apartado esperando decisión
  assert.equal(r.apartado, 600_000)
})

test('febrero: la semana 4 termina el 28', () => {
  const r = calcularPlan(entrada({ anio: 2027, mes: 2, hoy: '2027-02-01', ingresos: [{ fecha: '2027-02-01', monto: 400_000 }] }))
  assert.equal(r.semanas[3].hasta, 28)
})
