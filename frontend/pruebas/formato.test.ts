// Pruebas del formato de montos. Se corren con: npm test
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { formatearAlEscribir, interpretarFecha, montoParaEditar, parsearMonto, sumarDias } from '../src/formato.ts'

test('interpreta fechas escritas a mano', () => {
  const ref = '2026-11-05'
  assert.equal(interpretarFecha('12', ref), '2026-11-12')
  assert.equal(interpretarFecha(' 3 ', ref), '2026-11-03')
  assert.equal(interpretarFecha('12/10', ref), '2026-10-12')
  assert.equal(interpretarFecha('1-2', ref), '2026-02-01')
  assert.equal(interpretarFecha('12.10.25', ref), '2025-10-12')
  assert.equal(interpretarFecha('31/12/2025', ref), '2025-12-31')
  // Fechas que no existen o a medio escribir
  assert.equal(interpretarFecha('31', ref), null) // noviembre tiene 30 días
  assert.equal(interpretarFecha('29/2/2026', ref), null)
  assert.equal(interpretarFecha('12/10/2', ref), null)
  assert.equal(interpretarFecha('12/13', ref), null)
  assert.equal(interpretarFecha('0', ref), null)
  assert.equal(interpretarFecha('', ref), null)
  assert.equal(interpretarFecha('ayer', ref), null)
})

test('suma días cruzando meses y años', () => {
  assert.equal(sumarDias('2026-11-30', 1), '2026-12-01')
  assert.equal(sumarDias('2026-01-01', -1), '2025-12-31')
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29')
})

test('formatea al escribir', () => {
  assert.equal(formatearAlEscribir('12300'), '12.300')
  assert.equal(formatearAlEscribir('1234567'), '1.234.567')
  assert.equal(formatearAlEscribir('4500,5'), '4.500,5')
  assert.equal(formatearAlEscribir('4.500,555'), '4.500,55')
  assert.equal(formatearAlEscribir(',5'), '0,5')
  assert.equal(formatearAlEscribir('00012'), '12')
  assert.equal(formatearAlEscribir('$ 1a2b3'), '123')
  assert.equal(formatearAlEscribir(''), '')
  assert.equal(montoParaEditar(12300.5), '12.300,5')
  assert.equal(montoParaEditar(420000), '420.000')
  assert.equal(parsearMonto(formatearAlEscribir('1234567,89')), 1234567.89)
  assert.equal(parsearMonto(formatearAlEscribir('12300')), 12300)
  assert.equal(parsearMonto(formatearAlEscribir('500')), 500)
})
