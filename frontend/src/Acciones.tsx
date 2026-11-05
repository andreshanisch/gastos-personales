import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { HojaGasto } from './components/HojaGasto'
import { HojaIngreso } from './components/HojaIngreso'
import { hoyISO } from './formato'
import { useMes } from './MesContext'
import type { Categoria, Gasto, Ingreso } from './types'

interface Acciones {
  /** Cambia cada vez que se guarda algo: las páginas lo usan para volver a cargar sus datos */
  version: number
  refrescar: () => void
  nuevoGasto: () => void
  editarGasto: (gasto: Gasto) => void
  nuevoIngreso: () => void
  editarIngreso: (ingreso: Ingreso) => void
}

const Contexto = createContext<Acciones | null>(null)

/**
 * Cargar un gasto o un ingreso se puede desde cualquier pantalla (botones de la barra lateral
 * y atajos de teclado N e I). Los formularios viven acá, una sola vez para toda la app.
 */
export function AccionesProvider({ children }: { children: ReactNode }) {
  const { anio, mes, esMesActual } = useMes()
  const [version, setVersion] = useState(0)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [hojaGasto, setHojaGasto] = useState<{ abierta: boolean; gasto: Gasto | null }>({ abierta: false, gasto: null })
  const [hojaIngreso, setHojaIngreso] = useState<{ abierta: boolean; ingreso: Ingreso | null }>({ abierta: false, ingreso: null })

  const refrescar = useCallback(() => setVersion((v) => v + 1), [])

  const abrirGasto = useCallback((gasto: Gasto | null) => {
    // Las categorías pueden haber cambiado: se piden de nuevo cada vez que se abre
    api.categorias().then(setCategorias).catch(() => {})
    setHojaGasto({ abierta: true, gasto })
  }, [])

  const acciones = useMemo<Acciones>(() => ({
    version,
    refrescar,
    nuevoGasto: () => abrirGasto(null),
    editarGasto: (g) => abrirGasto(g),
    nuevoIngreso: () => setHojaIngreso({ abierta: true, ingreso: null }),
    editarIngreso: (i) => setHojaIngreso({ abierta: true, ingreso: i }),
  }), [version, refrescar, abrirGasto])

  // Atajos: N = nuevo gasto, I = nuevo ingreso (solo si no se está escribiendo en un campo)
  useEffect(() => {
    function alApretar(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const objetivo = e.target as HTMLElement
      const escribiendo = objetivo.closest('input, textarea, select, [contenteditable="true"]')
      // Un campo dentro de un diálogo ya cerrado no cuenta: quedó con el foco pero no se ve
      if (escribiendo && !escribiendo.closest('dialog:not([open])')) return
      if (document.querySelector('dialog[open]')) return
      const tecla = e.key.toLowerCase()
      if (tecla === 'n') { e.preventDefault(); acciones.nuevoGasto() }
      if (tecla === 'i') { e.preventDefault(); acciones.nuevoIngreso() }
    }
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [acciones])

  // Un ingreso nuevo arranca hoy, o el día 1 del mes que se está mirando
  const fechaIngreso = esMesActual ? hoyISO() : `${anio}-${String(mes).padStart(2, '0')}-01`

  return (
    <Contexto.Provider value={acciones}>
      {children}
      <HojaGasto
        abierta={hojaGasto.abierta}
        gasto={hojaGasto.gasto}
        categorias={categorias}
        alCerrar={() => setHojaGasto((h) => ({ ...h, abierta: false }))}
        alGuardar={refrescar}
      />
      <HojaIngreso
        abierta={hojaIngreso.abierta}
        ingreso={hojaIngreso.ingreso}
        fechaPorDefecto={fechaIngreso}
        alCerrar={() => setHojaIngreso((h) => ({ ...h, abierta: false }))}
        alGuardar={refrescar}
      />
    </Contexto.Provider>
  )
}

export function useAcciones() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useAcciones debe usarse dentro de AccionesProvider')
  return valor
}
