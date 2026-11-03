export type Moneda = 'ARS' | 'USD'

export interface Categoria {
  id: number
  nombre: string
  color: string
  archivada: boolean
}

export interface Gasto {
  id: number
  fecha: string // yyyy-MM-dd
  monto: number
  moneda: Moneda
  descripcion: string
  categoriaId: number
  categoriaNombre: string
  categoriaColor: string
}

export interface GastoRequest {
  fecha: string
  monto: number
  moneda: Moneda
  descripcion: string
  categoriaId: number
}

export interface Ingreso {
  id: number
  fecha: string // yyyy-MM-dd
  monto: number
  moneda: Moneda
  descripcion: string
}

export interface IngresoRequest {
  fecha: string
  monto: number
  moneda: Moneda
  descripcion: string
}

export interface CategoriaRequest {
  nombre: string
  color: string
  archivada: boolean
}

export interface TotalPorCategoria {
  categoriaId: number
  nombre: string
  color: string
  totalARS: number
  totalUSD: number
  cantidad: number
}

export interface ResumenMensual {
  anio: number
  mes: number
  totalARS: number
  totalUSD: number
  cantidadGastos: number
  totalARSMesAnterior: number
  ingresosARS: number
  ingresosUSD: number
  porCategoria: TotalPorCategoria[]
}
