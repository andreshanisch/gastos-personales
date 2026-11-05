import type { Categoria, Gasto, GastoRequest } from './types'

/*
 * Gastos cargados en el teléfono mientras la compu estaba apagada. Se guardan en el
 * propio teléfono (localStorage) y se mandan solos cuando la compu vuelve a contestar.
 * Mientras tanto aparecen en las listas con id negativo y la marca `pendiente`.
 */

export interface GastoPendiente {
  /** Negativo, para no chocar con los ids de la base */
  idLocal: number
  creadoEn: string
  datos: GastoRequest
  categoriaNombre: string
  categoriaColor: string
  /** Si la compu lo rechazó (por ejemplo, la categoría ya no existe), el motivo */
  error?: string
}

const CLAVE = 'gastos.pendientes'

type Oyente = () => void
const oyentes = new Set<Oyente>()
let sinConexion = false

function leer(): GastoPendiente[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as GastoPendiente[]) : []
  } catch {
    return []
  }
}

function escribir(lista: GastoPendiente[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)) } catch { /* sin almacenamiento */ }
  avisarCambio()
}

function avisarCambio() {
  for (const o of oyentes) o()
}

export function suscribir(oyente: Oyente) {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}

export function listarPendientes(): GastoPendiente[] {
  return leer()
}

// ---------- Estado de la conexión con la compu ----------

export function estaSinConexion() {
  return sinConexion
}

export function marcarConexion(conectado: boolean) {
  if (sinConexion === !conectado) return
  sinConexion = !conectado
  avisarCambio()
}

// ---------- La cola ----------

export function agregarPendiente(datos: GastoRequest, categoria?: Pick<Categoria, 'nombre' | 'color'>): Gasto {
  const lista = leer()
  const idLocal = Math.min(-1, ...lista.map((p) => p.idLocal - 1))
  const pendiente: GastoPendiente = {
    idLocal,
    creadoEn: new Date().toISOString(),
    datos,
    categoriaNombre: categoria?.nombre ?? 'Sin categoría',
    categoriaColor: categoria?.color ?? '#64748b',
  }
  escribir([...lista, pendiente])
  return aGasto(pendiente)
}

export function editarPendiente(idLocal: number, datos: GastoRequest, categoria?: Pick<Categoria, 'nombre' | 'color'>): Gasto | null {
  const lista = leer()
  const p = lista.find((x) => x.idLocal === idLocal)
  if (!p) return null
  p.datos = datos
  p.error = undefined
  if (categoria) { p.categoriaNombre = categoria.nombre; p.categoriaColor = categoria.color }
  escribir(lista)
  return aGasto(p)
}

export function quitarPendiente(idLocal: number) {
  escribir(leer().filter((p) => p.idLocal !== idLocal))
}

export function aGasto(p: GastoPendiente): Gasto {
  return {
    id: p.idLocal,
    ...p.datos,
    categoriaNombre: p.categoriaNombre,
    categoriaColor: p.categoriaColor,
    pendiente: true,
  }
}

/** Los pendientes de un mes, como gastos, para sumarlos a lo que trae la compu */
export function pendientesDelMes(anio: number, mes: number): Gasto[] {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}-`
  return leer().filter((p) => p.datos.fecha.startsWith(prefijo)).map(aGasto)
}

/**
 * Manda los pendientes a la compu, de a uno y en orden. Para apenas la compu no contesta.
 * Devuelve cuántos se guardaron.
 */
export async function enviarPendientes(
  crear: (datos: GastoRequest) => Promise<unknown>,
  esFaltaDeConexion: (err: unknown) => boolean,
): Promise<number> {
  let enviados = 0
  for (const p of leer()) {
    try {
      await crear(p.datos)
      quitarPendiente(p.idLocal)
      enviados++
    } catch (err) {
      if (esFaltaDeConexion(err)) break
      // La compu contestó pero no lo aceptó: queda en la lista con el motivo, para corregirlo
      const lista = leer()
      const actual = lista.find((x) => x.idLocal === p.idLocal)
      if (actual) { actual.error = (err as Error).message; escribir(lista) }
    }
  }
  return enviados
}
