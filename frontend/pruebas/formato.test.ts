// Pruebas del formato de montos. Se corren con: npm test
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { formatearAlEscribir, montoParaEditar, parsearMonto } from '../src/formato.ts'
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
