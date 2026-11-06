/*
 * Service worker de Mis gastos: guarda la app y los últimos datos en el teléfono para que
 * abra aunque la compu esté apagada. Solo se registra fuera de localhost (en el iPhone,
 * por la dirección de Tailscale). Los gastos que se cargan sin conexión los maneja la app
 * (src/pendientes.ts), no este archivo.
 */
const CACHE = 'mis-gastos-v1'
const BASICOS = ['/', '/manifest.webmanifest', '/icon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png']
// Si la compu no contesta en este tiempo, se usa lo guardado
const ESPERA_MS = 4000
// Lo que contesta Tailscale cuando la compu está prendida pero Mis gastos no está abierta
const SIN_LA_APP = new Set([502, 503, 504])

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function conEspera(pedido) {
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), ESPERA_MS)
  return fetch(pedido, { signal: control.signal }).finally(() => clearTimeout(reloj))
}

/** Pide a la compu; si responde, guarda la copia. Si no, devuelve la última copia marcada. */
async function primeroLaRed(pedido, claveCache) {
  const cache = await caches.open(CACHE)
  try {
    const respuesta = await conEspera(pedido)
    // Con la compu prendida pero sin la app abierta, Tailscale contesta 502 vacío:
    // eso también es "sin conexión", así que se usa la copia guardada
    if (SIN_LA_APP.has(respuesta.status)) throw new Error('la app no está abierta')
    if (respuesta.ok) cache.put(claveCache ?? pedido, respuesta.clone())
    return respuesta
  } catch {
    const guardada = await cache.match(claveCache ?? pedido)
    if (guardada) {
      // Se avisa a la app que esto es lo último guardado, no lo que hay ahora en la compu
      const encabezados = new Headers(guardada.headers)
      encabezados.set('X-Sin-Conexion', '1')
      return new Response(await guardada.blob(), { status: guardada.status, headers: encabezados })
    }
    return new Response(JSON.stringify({ mensaje: 'Sin conexión con la compu y sin datos guardados para esto.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'X-Sin-Conexion': '1' },
    })
  }
}

/** Archivos con hash en el nombre: si ya están guardados, no cambian nunca */
async function primeroLoGuardado(pedido) {
  const cache = await caches.open(CACHE)
  const guardada = await cache.match(pedido)
  if (guardada) return guardada
  const respuesta = await fetch(pedido)
  if (respuesta.ok) cache.put(pedido, respuesta.clone())
  return respuesta
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return // guardar, editar y borrar van siempre a la compu
  const url = new URL(pedido.url)
  if (url.origin !== self.location.origin) return

  if (pedido.mode === 'navigate') {
    // La página es siempre la misma (las rutas van después del #): se guarda una sola copia
    evento.respondWith(primeroLaRed(pedido, '/'))
  } else if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(primeroLoGuardado(pedido))
  } else {
    // /api/... y los íconos
    evento.respondWith(primeroLaRed(pedido))
  }
})
