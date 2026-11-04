// Pruebas del cálculo del plan semanal. Se corren con: npm test
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { calcularPlan, type EntradaPlan, type GastoPlan } from '../src/plan.ts'

const ALQUILER = 1
const SUPER = 2
const TARJETA = 3

const alquilerDia1: GastoPlan = { fecha: '2026-11-01', monto: 200_000, categoriaId: ALQUILER }

function entrada(cambios: Partial<EntradaPlan> = {}): EntradaPlan {
  return {
    anio: 2026,
    mes: 11,
    hoy: '2026-11-03',
    ingresos: [{ fecha: '2026-11-01', monto: 800_000 }],
    gastos: [alquilerDia1],
    obligatorias: new Set([ALQUILER, TARJETA]),
    decisiones: new Map(),
    ...cambios,
  }
}

const asignados = (r: ReturnType<typeof calcularPlan>) => r.semanas.map((s) => s.asignado)

test('un obligatorio pagado el día 1 se reparte entre las 4 semanas', () => {
  const r = calcularPlan(entrada())
  assert.equal(r.obligatoriosPagados, 200_000)
  assert.equal(r.libre, 600_000)
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
  assert.deepEqual(r.semanas.map((s) => s.acumulado), [150_000, 300_000, 450_000, 600_000])
  assert.deepEqual(r.semanas.map((s) => s.estado), ['en-curso', 'proxima', 'proxima', 'proxima'])
  assert.equal(r.semanaActual, 1)
})

test('sin obligatorios pagados, todo el ingreso queda libre', () => {
  const r = calcularPlan(entrada({ gastos: [] }))
  assert.equal(r.obligatoriosPagados, 0)
  assert.deepEqual(asignados(r), [200_000, 200_000, 200_000, 200_000])
})

test('los obligatorios salen solo de lo cargado este mes en esas categorías', () => {
  const r = calcularPlan(entrada({
    gastos: [
      alquilerDia1,
      { fecha: '2026-11-02', monto: 40_000, categoriaId: TARJETA },
      { fecha: '2026-11-02', monto: 30_000, categoriaId: SUPER },
    ],
  }))
  assert.equal(r.obligatoriosPagados, 240_000)
  assert.deepEqual(r.obligatorias, [
    { categoriaId: ALQUILER, pagado: 200_000 },
    { categoriaId: TARJETA, pagado: 40_000 },
  ])
  // El súper es gasto común de la semana 1; los obligatorios no cuentan como gastado
  assert.equal(r.semanas[0].gastado, 30_000)
})

test('un obligatorio pagado a mitad de mes no cambia las semanas anteriores', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-12',
    gastos: [alquilerDia1, { fecha: '2026-11-10', monto: 90_000, categoriaId: TARJETA }],
  }))
  // La tarjeta del día 10 (semana 2) se descuenta de las semanas 2, 3 y 4: 30.000 de cada una
  assert.deepEqual(asignados(r), [150_000, 120_000, 120_000, 120_000])
})

test('un ingreso de mitad de mes solo suma desde su semana en adelante', () => {
  const r = calcularPlan(entrada({
    ingresos: [
      { fecha: '2026-11-01', monto: 400_000 },
      { fecha: '2026-11-15', monto: 400_000 },
    ],
  }))
  // Semana 1: (400.000 - 200.000) / 4 = 50.000; semana 3: 400.000 / 2 = 200.000 más para las semanas 3 y 4
  assert.deepEqual(asignados(r), [50_000, 50_000, 250_000, 250_000])
})

test('si un obligatorio deja una semana sin plata, lo que falta pasa a la siguiente', () => {
  const r = calcularPlan(entrada({
    ingresos: [
      { fecha: '2026-11-01', monto: 100_000 },
      { fecha: '2026-11-16', monto: 500_000 },
    ],
    gastos: [{ fecha: '2026-11-01', monto: 300_000, categoriaId: ALQUILER }],
  }))
  // Semanas 1 y 2: 25.000 - 75.000 = -50.000 cada una; se pasan a la semana 3
  // Semana 3: -50.000 + 250.000 - 100.000 (lo que viene de 1 y 2) = 100.000
  assert.deepEqual(asignados(r), [0, 0, 100_000, 200_000])
  assert.equal(r.obligatoriosSinCubrir, 0)
})

test('avisa cuando los ingresos no alcanzan para los obligatorios', () => {
  const r = calcularPlan(entrada({ ingresos: [{ fecha: '2026-11-01', monto: 150_000 }] }))
  assert.equal(r.obligatoriosSinCubrir, 50_000)
  assert.deepEqual(asignados(r), [0, 0, 0, 0])
  assert.equal(r.libre, 0)
})

test('el exceso de una semana se descuenta en partes iguales de las siguientes', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [alquilerDia1, { fecha: '2026-11-05', monto: 180_000, categoriaId: SUPER }],
  }))
  const [s1, s2, s3, s4] = r.semanas
  assert.equal(s1.saldo, -30_000)
  assert.equal(s1.descuentoPorSemanaSiguiente, 10_000)
  assert.deepEqual([s2.asignado, s3.asignado, s4.asignado], [140_000, 140_000, 140_000])
})

test('el exceso se descuenta apenas ocurre, aunque la semana no haya terminado', () => {
  const r = calcularPlan(entrada({
    gastos: [alquilerDia1, { fecha: '2026-11-02', monto: 210_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].estado, 'en-curso')
  assert.deepEqual(asignados(r), [150_000, 130_000, 130_000, 130_000])
})

test('el sobrante de una semana terminada espera la decisión y queda apartado', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [alquilerDia1, { fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].saldo, 60_000)
  assert.equal(r.semanas[0].decisionPendiente, true)
  assert.equal(r.apartado, 60_000)
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
})

test('el sobrante elegido como ahorro no se suma a las semanas siguientes', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [alquilerDia1, { fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
    decisiones: new Map([[1, 'Ahorrar']]),
  }))
  assert.equal(r.ahorrado, 60_000)
  assert.equal(r.apartado, 0)
  assert.deepEqual(asignados(r), [150_000, 150_000, 150_000, 150_000])
})

test('el sobrante repartido se suma en partes iguales a las semanas que quedan', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-10',
    gastos: [alquilerDia1, { fecha: '2026-11-03', monto: 90_000, categoriaId: SUPER }],
    decisiones: new Map([[1, 'Repartir']]),
  }))
  assert.deepEqual(asignados(r), [150_000, 170_000, 170_000, 170_000])
})

test('una semana en curso con sobrante todavía no pide decisión', () => {
  const r = calcularPlan(entrada({
    gastos: [alquilerDia1, { fecha: '2026-11-02', monto: 10_000, categoriaId: SUPER }],
  }))
  assert.equal(r.semanas[0].decisionPendiente, false)
})

test('el exceso de la última semana queda sin cubrir', () => {
  const r = calcularPlan(entrada({
    hoy: '2026-11-30',
    gastos: [alquilerDia1, { fecha: '2026-11-25', monto: 170_000, categoriaId: SUPER }],
  }))
  assert.equal(r.excesoSinCubrir, 20_000)
})

test('un mes pasado tiene todas las semanas terminadas', () => {
  const r = calcularPlan(entrada({ hoy: '2026-12-05' }))
  assert.deepEqual(r.semanas.map((s) => s.estado), ['terminada', 'terminada', 'terminada', 'terminada'])
  assert.equal(r.semanaActual, null)
  assert.equal(r.apartado, 600_000)
})

test('las semanas cubren el mes: la 4 termina el último día', () => {
  assert.deepEqual(calcularPlan(entrada()).semanas.map((s) => [s.desde, s.hasta]), [[1, 7], [8, 14], [15, 21], [22, 30]])
  const febrero = calcularPlan(entrada({ anio: 2027, mes: 2, hoy: '2027-02-01', ingresos: [], gastos: [] }))
  assert.equal(febrero.semanas[3].hasta, 28)
})
