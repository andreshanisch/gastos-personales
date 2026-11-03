import type {
  Categoria, CategoriaRequest, Gasto, GastoRequest, ResumenMensual,
} from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5080').replace(/\/$/, '')
const CLAVE_SESION = 'gastos.sesion'

interface Sesion {
  token: string
  expira: string
}

// ---------- Sesión ----------
// El token se guarda en este navegador para no tener que loguearse cada vez.

export function leerSesion(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const sesion = JSON.parse(crudo) as Sesion
    if (new Date(sesion.expira) <= new Date()) {
      localStorage.removeItem(CLAVE_SESION)
      return null
    }
    return sesion
  } catch {
    return null
  }
}

function guardarSesion(sesion: Sesion) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura mientras la pestaña esté abierta
  }
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch { /* nada que limpiar */ }
}

let tokenEnMemoria: string | null = leerSesion()?.token ?? null
let alExpirar: () => void = () => {}

export function onSesionExpirada(callback: () => void) {
  alExpirar = callback
}

// ---------- Cliente HTTP ----------

export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje)
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const headers = new Headers(opciones.headers)
  if (opciones.body) headers.set('Content-Type', 'application/json')
  if (tokenEnMemoria) headers.set('Authorization', `Bearer ${tokenEnMemoria}`)

  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}${ruta}`, { ...opciones, headers })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Si recién lo abriste, puede tardar un minuto en despertar.')
  }

  if (respuesta.status === 401 && ruta !== '/api/auth/login') {
    tokenEnMemoria = null
    cerrarSesion()
    alExpirar()
    throw new ErrorApi(401, 'La sesión expiró. Volvé a iniciar sesión.')
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await extraerMensaje(respuesta))
  }

  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

async function extraerMensaje(respuesta: Response): Promise<string> {
  if (respuesta.status === 429) return 'Demasiados intentos. Esperá un minuto y probá de nuevo.'
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

// ---------- Endpoints ----------

export async function login(usuario: string, password: string) {
  const sesion = await pedir<Sesion>('/api/auth/login', {
    method: 'POST',
    body: json({ usuario, password }),
  })
  tokenEnMemoria = sesion.token
  guardarSesion(sesion)
}

export function logout() {
  tokenEnMemoria = null
  cerrarSesion()
}

export const api = {
  gastos: (anio: number, mes: number) =>
    pedir<Gasto[]>(`/api/gastos?anio=${anio}&mes=${mes}`),
  crearGasto: (g: GastoRequest) =>
    pedir<Gasto>('/api/gastos', { method: 'POST', body: json(g) }),
  editarGasto: (id: number, g: GastoRequest) =>
    pedir<Gasto>(`/api/gastos/${id}`, { method: 'PUT', body: json(g) }),
  eliminarGasto: (id: number) =>
    pedir<void>(`/api/gastos/${id}`, { method: 'DELETE' }),

  categorias: (incluirArchivadas = false) =>
    pedir<Categoria[]>(`/api/categorias?incluirArchivadas=${incluirArchivadas}`),
  crearCategoria: (c: CategoriaRequest) =>
    pedir<Categoria>('/api/categorias', { method: 'POST', body: json(c) }),
  editarCategoria: (id: number, c: CategoriaRequest) =>
    pedir<Categoria>(`/api/categorias/${id}`, { method: 'PUT', body: json(c) }),
  eliminarCategoria: (id: number) =>
    pedir<void>(`/api/categorias/${id}`, { method: 'DELETE' }),

  resumen: (anio: number, mes: number) =>
    pedir<ResumenMensual>(`/api/resumen?anio=${anio}&mes=${mes}`),
}
