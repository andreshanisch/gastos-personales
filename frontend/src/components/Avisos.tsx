import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type TipoAviso = 'exito' | 'error'

interface Aviso {
  id: number
  texto: string
  tipo: TipoAviso
}

const Contexto = createContext<((texto: string, tipo?: TipoAviso) => void) | null>(null)

/** Avisos cortos que aparecen abajo a la derecha y se van solos ("Gasto guardado"). */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguiente = useRef(1)

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'exito') => {
    const id = siguiente.current++
    setAvisos((lista) => [...lista.slice(-2), { id, texto, tipo }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), tipo === 'error' ? 6000 : 3200)
  }, [])

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante aviso-flotante--${a.tipo}`}>
            {a.tipo === 'exito' ? <IconoTilde /> : <IconoAlerta />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export function useAvisos() {
  const avisar = useContext(Contexto)
  if (!avisar) throw new Error('useAvisos debe usarse dentro de AvisosProvider')
  return avisar
}

function IconoTilde() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoAlerta() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 6v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="1.2" fill="currentColor" />
    </svg>
  )
}
