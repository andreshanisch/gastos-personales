import type {
  Categoria, CategoriaRequest, DecisionSobrante, Gasto, GastoRequest, Historial, Ingreso, IngresoRequest, PlanMes,
  ResultadoBusqueda, ResumenMensual,
} from './types'

// La página y la API comparten dirección (http://localhost:5080), así que las rutas son relativas

export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje)
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const headers = new Headers(opciones.headers)
  if (opciones.body) headers.set('Content-Type', 'application/json')

  let respuesta: Response
  try {
    respuesta = await fetch(ruta, { ...opciones, headers })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con la app. Revisá que la ventana de "Mis gastos" siga abierta.')
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await extraerMensaje(respuesta))
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
  gastos: (anio: number, mes: number) =>
    pedir<Gasto[]>(`/api/gastos?anio=${anio}&mes=${mes}`),
  crearGasto: (g: GastoRequest) =>
    pedir<Gasto>('/api/gastos', { method: 'POST', body: json(g) }),
  editarGasto: (id: number, g: GastoRequest) =>
    pedir<Gasto>(`/api/gastos/${id}`, { method: 'PUT', body: json(g) }),
  eliminarGasto: (id: number) =>
    pedir<void>(`/api/gastos/${id}`, { method: 'DELETE' }),

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

  resumen: (anio: number, mes: number) =>
    pedir<ResumenMensual>(`/api/resumen?anio=${anio}&mes=${mes}`),
}
