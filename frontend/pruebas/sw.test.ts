// Pruebas del service worker (public/sw.js) fuera del navegador: se simulan caches y fetch
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { beforeEach, test } from 'node:test'
import vm from 'node:vm'

const codigo = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const ORIGEN = 'https://compu.tailnet.ts.net'

let almacen: Map<string, Response>
let red: Response | Error
let oyentes: Record<string, (evento: unknown) => void>

beforeEach(() => {
  almacen = new Map()
  oyentes = {}
  const clave = (r: string | { url: string }) => (typeof r === 'string' ? new URL(r, ORIGEN).href : r.url)
  const cache = {
    match: async (r: string | { url: string }) => almacen.get(clave(r))?.clone(),
    put: async (r: string | { url: string }, resp: Response) => { almacen.set(clave(r), resp) },
    addAll: async () => {},
  }
  const contexto = {
    self: {
      location: { origin: ORIGEN },
      addEventListener: (tipo: string, f: (e: unknown) => void) => { oyentes[tipo] = f },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async () => { if (red instanceof Error) throw red; return red.clone() },
    Response, Headers, URL, AbortController, setTimeout, clearTimeout,
  }
  vm.createContext(contexto)
  vm.runInContext(codigo, contexto)
})

async function pedir(ruta: string, modo = 'cors') {
  let resultado: Promise<Response> | undefined
  oyentes.fetch({ request: { method: 'GET', url: ORIGEN + ruta, mode: modo }, respondWith: (p: Promise<Response>) => { resultado = p } })
  const r = await resultado!
  return { status: r.status, sinConexion: r.headers.get('X-Sin-Conexion'), cuerpo: await r.text() }
}

async function guardarConLaAppAbierta() {
  red = new Response('<html>app</html>', { status: 200 })
  await pedir('/', 'navigate')
  red = new Response('[{"id":1}]', { status: 200 })
  await pedir('/api/gastos?anio=2026&mes=11')
}

test('con la app abierta devuelve lo que contesta la compu', async () => {
  red = new Response('[{"id":1}]', { status: 200 })
  const r = await pedir('/api/gastos?anio=2026&mes=11')
  assert.equal(r.status, 200)
  assert.equal(r.sinConexion, null)
})

test('compu prendida sin la app (Tailscale contesta 502): usa la copia guardada', async () => {
  await guardarConLaAppAbierta()
  red = new Response('', { status: 502 })
  const pagina = await pedir('/', 'navigate')
  assert.equal(pagina.cuerpo, '<html>app</html>')
  assert.equal(pagina.sinConexion, '1')
  const datos = await pedir('/api/gastos?anio=2026&mes=11')
  assert.equal(datos.cuerpo, '[{"id":1}]')
  assert.equal(datos.sinConexion, '1')
})

test('compu apagada (la red falla): usa la copia guardada', async () => {
  await guardarConLaAppAbierta()
  red = new Error('sin red')
  const pagina = await pedir('/', 'navigate')
  assert.equal(pagina.status, 200)
  assert.equal(pagina.sinConexion, '1')
})

test('sin conexión y sin copia: 503 con un mensaje claro', async () => {
  red = new Response('', { status: 502 })
  const r = await pedir('/api/resumen?anio=2026&mes=11')
  assert.equal(r.status, 503)
  assert.equal(r.sinConexion, '1')
  assert.match(r.cuerpo, /Sin conexión con la compu/)
})

test('un error real de la app (404) no se tapa con la copia', async () => {
  await guardarConLaAppAbierta()
  red = new Response('{"mensaje":"no existe"}', { status: 404 })
  const r = await pedir('/api/gastos?anio=2026&mes=11')
  assert.equal(r.status, 404)
  assert.equal(r.sinConexion, null)
})
