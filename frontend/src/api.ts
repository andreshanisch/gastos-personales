import {
  agregarPendiente, editarPendiente, marcarConexion, pendientesDelMes, quitarPendiente,
} from './pendientes'
import type {
  Categoria, CategoriaRequest, DecisionSobrante, Gasto, GastoRequest, Historial, Ingreso, IngresoRequest, PlanMes,
  ResultadoBusqueda, ResumenMensual,
} from './types'

// La página y la API comparten dirección (http://localhost:5080), así que las rutas son relativas

export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string, public sinConexion = false) {
    super(mensaje)
  }
}

/** true si el error es porque la compu no contestó (apagada, sin la app abierta o sin red) */
export function esFaltaDeConexion(err: unknown) {
  return err instanceof ErrorApi && (err.status === 0 || err.sinConexion)
}

// En la compu la app y la página son lo mismo; en el teléfono, la compu puede estar apagada
const enLaCompu = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
const MENSAJE_SIN_CONEXION = enLaCompu
  ? 'No se pudo conectar con la app. Revisá que la ventana de "Mis gastos" siga abierta.'
  : 'No hay conexión con la compu. Fijate que esté prendida, con Tailscale y Mis gastos abiertos.'
// Guardar, editar o borrar con la compu apagada no debe dejar la pantalla esperando para siempre
const ESPERA_MS = 8000

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const headers = new Headers(opciones.headers)
  if (opciones.body) headers.set('Content-Type', 'application/json')

  let respuesta: Response
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), ESPERA_MS)
  try {
    respuesta = await fetch(ruta, { ...opciones, headers, signal: control.signal })
  } catch {
    marcarConexion(false)
    throw new ErrorApi(0, MENSAJE_SIN_CONEXION, true)
  } finally {
    clearTimeout(reloj)
  }

  // El service worker marca así lo que viene de la copia guardada en el teléfono
  // Tailscale contesta 502/503/504 cuando la compu está prendida pero Mis gastos no está abierta
  const desdeCopia = respuesta.headers.get('X-Sin-Conexion') === '1'
    || (!enLaCompu && [502, 503, 504].includes(respuesta.status))
  marcarConexion(!desdeCopia)

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, desdeCopia ? MENSAJE_SIN_CONEXION : await extraerMensaje(respuesta), desdeCopia)
  }

  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

async function extraerMensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = await respuesta.json()
    if (cuerpo?.mensaje) return cuerpo.mensaje
    // Errores de validación de ASP.NET Core
    if (cuerpo?.errors) {
      const primero = Object.values(cuerpo.errors as Record<string, string[]>)[0]
      if (primero?.[0]) return primero[0]
    }
  } catch { /* respuesta sin JSON */ }
  return `Error del servidor (${respuesta.status}).`
}

const json = (cuerpo: unknown) => JSON.stringify(cuerpo)

export const api = {
  /** Los gastos del mes, más los que quedaron pendientes en el teléfono (con id negativo) */
  gastos: async (anio: number, mes: number) => {
    const deLaCompu = await pedir<Gasto[]>(`/api/gastos?anio=${anio}&mes=${mes}`)
    const pendientes = pendientesDelMes(anio, mes)
    return pendientes.length ? [...pendientes, ...deLaCompu] : deLaCompu
  },
  /** Sin conexión con la compu, el gasto queda pendiente en el teléfono y se manda después */
  crearGasto: async (g: GastoRequest, categoria?: Pick<Categoria, 'nombre' | 'color'>) => {
    try {
      return await pedir<Gasto>('/api/gastos', { method: 'POST', body: json(g) })
    } catch (err) {
      if (esFaltaDeConexion(err)) return agregarPendiente(g, categoria)
      throw err
    }
  },
  /** Solo lo que llega a la compu; la cola de pendientes la vacía Sincronizacion.tsx */
  enviarGasto: (g: GastoRequest) =>
    pedir<Gasto>('/api/gastos', { method: 'POST', body: json(g) }),
  editarGasto: async (id: number, g: GastoRequest, categoria?: Pick<Categoria, 'nombre' | 'color'>) => {
    if (id < 0) {
      const editado = editarPendiente(id, g, categoria)
      if (!editado) throw new ErrorApi(404, 'Ese gasto pendiente ya se mandó a la compu.')
      return editado
    }
    return pedir<Gasto>(`/api/gastos/${id}`, { method: 'PUT', body: json(g) })
  },
  eliminarGasto: async (id: number) => {
    if (id < 0) return quitarPendiente(id)
    return pedir<void>(`/api/gastos/${id}`, { method: 'DELETE' })
  },

  ingresos: (anio: number, mes: number) =>
    pedir<Ingreso[]>(`/api/ingresos?anio=${anio}&mes=${mes}`),
  crearIngreso: (i: IngresoRequest) =>
    pedir<Ingreso>('/api/ingresos', { method: 'POST', body: json(i) }),
  editarIngreso: (id: number, i: IngresoRequest) =>
    pedir<Ingreso>(`/api/ingresos/${id}`, { method: 'PUT', body: json(i) }),
  eliminarIngreso: (id: number) =>
    pedir<void>(`/api/ingresos/${id}`, { method: 'DELETE' }),
  copiarIngresosMesAnterior: (anio: number, mes: number) =>
    pedir<Ingreso[]>(`/api/ingresos/copiar-mes-anterior?anio=${anio}&mes=${mes}`, { method: 'POST' }),

  categorias: (incluirArchivadas = false) =>
    pedir<Categoria[]>(`/api/categorias?incluirArchivadas=${incluirArchivadas}`),
  crearCategoria: (c: CategoriaRequest) =>
    pedir<Categoria>('/api/categorias', { method: 'POST', body: json(c) }),
  editarCategoria: (id: number, c: CategoriaRequest) =>
    pedir<Categoria>(`/api/categorias/${id}`, { method: 'PUT', body: json(c) }),
  eliminarCategoria: (id: number) =>
    pedir<void>(`/api/categorias/${id}`, { method: 'DELETE' }),
  marcarObligatoria: (id: number, obligatoria: boolean) =>
    pedir<Categoria>(`/api/categorias/${id}/obligatoria`, { method: 'PUT', body: json({ obligatoria }) }),

  plan: (anio: number, mes: number) =>
    pedir<PlanMes>(`/api/plan?anio=${anio}&mes=${mes}`),
  guardarDecision: (anio: number, mes: number, semana: number, decision: DecisionSobrante | null) =>
    pedir<PlanMes>(`/api/plan/decisiones?anio=${anio}&mes=${mes}`, { method: 'PUT', body: json({ semana, decision }) }),

  historial: (meses: number) =>
    pedir<Historial>(`/api/historial?meses=${meses}`),
  buscarGastos: (filtros: { texto?: string; categoriaId?: number; desde?: string; hasta?: string; moneda?: string }) => {
    const parametros = new URLSearchParams()
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') parametros.set(clave, String(valor))
    }
    return pedir<ResultadoBusqueda>(`/api/gastos/buscar?${parametros}`)
  },

  /** Para saber si la compu volvió a contestar */
  salud: () => pedir<{ estado: string }>('/health'),

  resumen: (anio: number, mes: number) =>
    pedir<ResumenMensual>(`/api/resumen?anio=${anio}&mes=${mes}`),
}
