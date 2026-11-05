import { api } from './api'
import { hoyISO } from './formato'
import { calcularDesdeHoy, calcularPlan, type EntradaPlan } from './plan'
import type { Categoria, Gasto, Ingreso, PlanMes } from './types'

// ---------- Cómo calcula el Plan: lo eligió Andres en la pantalla Plan y queda guardado ----------

/** 'mes' = plan de todo el mes; un número = repartir lo que hay hoy en esa cantidad de semanas */
export type Modo = 'mes' | 1 | 2 | 3 | 4
export const CLAVE_MODO = 'gastos.plan.modo'
/** Hasta qué semana se repartió "lo que tengo hoy" la última vez, para volver a eso al elegirlo */
export const CLAVE_SEMANAS = 'gastos.plan.semanas'

export function leerNumero(clave: string): 1 | 2 | 3 | 4 | null {
  try {
    const valor = localStorage.getItem(clave)
    if (valor === '1' || valor === '2' || valor === '3' || valor === '4') return Number(valor) as 1 | 2 | 3 | 4
  } catch { /* sin almacenamiento: se usa el valor por defecto */ }
  return null
}

export function guardarPreferencia(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor) } catch { /* no pasa nada si no se guarda */ }
}

// ---------- Entrada del plan a partir de los datos de la API ----------

export function armarEntrada(
  anio: number,
  mes: number,
  datos: { categorias: Categoria[]; gastos: Gasto[]; ingresos: Ingreso[]; plan: PlanMes },
): EntradaPlan {
  return {
    anio,
    mes,
    hoy: hoyISO(),
    // Los movimientos en dólares no entran en el plan
    ingresos: datos.ingresos.filter((i) => i.moneda === 'ARS'),
    gastos: datos.gastos.filter((g) => g.moneda === 'ARS'),
    obligatorias: new Set(datos.categorias.filter((c) => c.obligatoria).map((c) => c.id)),
    decisiones: new Map(datos.plan.decisiones.map((d) => [d.semana, d.decision])),
  }
}

/**
 * Lo que queda para gastar en la semana en curso, calculado igual que la tarjeta del Plan
 * (con el modo que esté elegido ahí). Negativo si ya se pasó.
 */
export async function saldoDeEstaSemana(): Promise<number> {
  const [anio, mes] = hoyISO().split('-').map(Number)
  const [categorias, gastos, ingresos, plan] = await Promise.all([
    api.categorias(),
    api.gastos(anio, mes),
    api.ingresos(anio, mes),
    api.plan(anio, mes),
  ])
  const entrada = armarEntrada(anio, mes, { categorias, gastos, ingresos, plan })
  const resultado = calcularPlan(entrada)
  const modo = leerNumero(CLAVE_MODO)
  const desdeHoy = modo ? calcularDesdeHoy(entrada, modo, resultado.ahorrado) : null
  const actual = desdeHoy ? desdeHoy.semanas[0] : resultado.semanas[(resultado.semanaActual ?? 1) - 1]
  return actual.saldo
}
