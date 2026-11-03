import { createContext, useContext, useState, type ReactNode } from 'react'

interface MesSeleccionado {
  anio: number
  mes: number
  mover: (delta: number) => void
  esMesActual: boolean
}

const Contexto = createContext<MesSeleccionado | null>(null)

/** El mes elegido se comparte entre las pestañas de Gastos y Resumen. */
export function MesProvider({ children }: { children: ReactNode }) {
  const hoy = new Date()
  const [fecha, setFecha] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 })

  const mover = (delta: number) =>
    setFecha(({ anio, mes }) => {
      const d = new Date(anio, mes - 1 + delta, 1)
      return { anio: d.getFullYear(), mes: d.getMonth() + 1 }
    })

  const esMesActual = fecha.anio === hoy.getFullYear() && fecha.mes === hoy.getMonth() + 1

  return (
    <Contexto.Provider value={{ ...fecha, mover, esMesActual }}>
      {children}
    </Contexto.Provider>
  )
}

export function useMes() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useMes debe usarse dentro de MesProvider')
  return valor
}
