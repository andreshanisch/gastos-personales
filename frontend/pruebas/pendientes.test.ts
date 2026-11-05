// Pruebas de la cola de gastos pendientes (los que se cargan en el teléfono sin conexión)
import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'

// En Node no hay localStorage: alcanza con uno en memoria
const memoria = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, v) },
  removeItem: (k: string) => { memoria.delete(k) },
  clear: () => memoria.clear(),
  key: () => null,
  length: 0,
} as Storage

const p = await import('../src/pendientes.ts')

const gasto = (fecha: string, monto = 1000) => ({ fecha, monto, moneda: 'ARS' as const, descripcion: 'prueba', categoriaId: 3 })
const falta = new Error('sin conexión')

beforeEach(() => memoria.clear())

test('un gasto pendiente aparece con id negativo y la marca pendiente', () => {
  const g = p.agregarPendiente(gasto('2026-11-05'), { nombre: 'Súper', color: '#16a34a' })
  assert.equal(g.id, -1)
  assert.equal(g.pendiente, true)
  assert.equal(g.categoriaNombre, 'Súper')
  const otro = p.agregarPendiente(gasto('2026-11-06'))
  assert.equal(otro.id, -2)
})

test('pendientesDelMes devuelve solo los de ese mes', () => {
  p.agregarPendiente(gasto('2026-11-05'))
  p.agregarPendiente(gasto('2026-10-31'))
  assert.equal(p.pendientesDelMes(2026, 11).length, 1)
  assert.equal(p.pendientesDelMes(2026, 10).length, 1)
  assert.equal(p.pendientesDelMes(2026, 12).length, 0)
})

test('se puede editar y quitar un pendiente', () => {
  const g = p.agregarPendiente(gasto('2026-11-05', 500))
  p.editarPendiente(g.id, gasto('2026-11-07', 900))
  assert.equal(p.listarPendientes()[0].datos.monto, 900)
  p.quitarPendiente(g.id)
  assert.equal(p.listarPendientes().length, 0)
})

test('al mandar, se quitan los que la compu guardó y se para si deja de contestar', async () => {
  p.agregarPendiente(gasto('2026-11-01', 1))
  p.agregarPendiente(gasto('2026-11-02', 2))
  p.agregarPendiente(gasto('2026-11-03', 3))
  let llamadas = 0
  const enviados = await p.enviarPendientes(async () => {
    llamadas++
    if (llamadas === 2) throw falta
  }, (e) => e === falta)
  assert.equal(enviados, 1)
  assert.equal(llamadas, 2) // el tercero ni se intentó
  assert.deepEqual(p.listarPendientes().map((x) => x.datos.monto), [2, 3])
})

test('si la compu rechaza uno, queda con el motivo y se siguen mandando los demás', async () => {
  p.agregarPendiente(gasto('2026-11-01', 1))
  p.agregarPendiente(gasto('2026-11-02', 2))
  const enviados = await p.enviarPendientes(async (d) => {
    if (d.monto === 1) throw new Error('La categoría no existe.')
  }, (e) => e === falta)
  assert.equal(enviados, 1)
  const quedan = p.listarPendientes()
  assert.equal(quedan.length, 1)
  assert.equal(quedan[0].error, 'La categoría no existe.')
})

test('el estado de conexión avisa a quien escucha solo cuando cambia', () => {
  let avisos = 0
  const dejar = p.suscribir(() => avisos++)
  p.marcarConexion(false)
  p.marcarConexion(false)
  assert.equal(p.estaSinConexion(), true)
  p.marcarConexion(true)
  assert.equal(avisos, 2)
  dejar()
})
