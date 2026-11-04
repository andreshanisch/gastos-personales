import type { Row, SheetData } from 'write-excel-file/browser'
import type { Gasto } from './types'

const FORMATO_MONTO = '#,##0.00'
const FORMATO_FECHA = 'dd/mm/yyyy'

const encabezado = (texto: string, alinear: 'left' | 'right' = 'left') =>
  ({ value: texto, fontWeight: 'bold' as const, align: alinear })

/** Arma la planilla: una fila por gasto y, al final, el total de cada moneda. */
export function filasExcel(gastos: Gasto[]): SheetData {
  const filas: SheetData = [[
    encabezado('Fecha'),
    encabezado('Categoría'),
    encabezado('Descripción'),
    encabezado('Moneda'),
    encabezado('Monto', 'right'),
  ]]

  for (const g of gastos) {
    const [a, m, d] = g.fecha.split('-').map(Number)
    filas.push([
      // Fecha a mediodía UTC: así no se corre de día por la zona horaria
      { value: new Date(Date.UTC(a, m - 1, d, 12)), type: Date, format: FORMATO_FECHA },
      { value: g.categoriaNombre, type: String },
      { value: g.descripcion, type: String },
      { value: g.moneda, type: String },
      { value: g.monto, type: Number, format: FORMATO_MONTO },
    ])
  }

  const totales = new Map<string, number>()
  for (const g of gastos) totales.set(g.moneda, (totales.get(g.moneda) ?? 0) + g.monto)
  if (totales.size > 0) filas.push([])
  for (const [moneda, total] of totales) {
    const fila: Row = [
      { value: `Total ${moneda}`, type: String, fontWeight: 'bold' },
      null,
      null,
      { value: moneda, type: String },
      { value: Math.round(total * 100) / 100, type: Number, format: FORMATO_MONTO, fontWeight: 'bold' },
    ]
    filas.push(fila)
  }
  return filas
}

export const opcionesHoja = {
  sheet: 'Gastos',
  stickyRowsCount: 1,
  columns: [{ width: 12 }, { width: 22 }, { width: 40 }, { width: 9 }, { width: 16 }],
}

/** Descarga los gastos como archivo de Excel (.xlsx). */
export async function exportarExcel(gastos: Gasto[], nombreArchivo: string) {
  // Se carga recién al exportar, así no pesa en el resto de la app
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  await writeXlsxFile(filasExcel(gastos), opcionesHoja).toFile(nombreArchivo)
}
