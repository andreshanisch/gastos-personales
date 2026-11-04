import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface Pedido {
  titulo: string
  mensaje?: string
  /** Texto del botón que confirma; dice exactamente lo que pasa ("Eliminar gasto") */
  confirmar: string
  peligro?: boolean
}

type Confirmar = (pedido: Pedido) => Promise<boolean>

const Contexto = createContext<Confirmar | null>(null)

/** Reemplaza al confirm() del navegador por un diálogo con el estilo de la app. */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const resolver = useRef<(valor: boolean) => void>(() => {})
  const dialogo = useRef<HTMLDialogElement>(null)

  const confirmar = useCallback<Confirmar>((p) => {
    setPedido(p)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (pedido && !d.open) d.showModal()
    if (!pedido && d.open) d.close()
  }, [pedido])

  function responder(valor: boolean) {
    resolver.current(valor)
    setPedido(null)
  }

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <dialog
        ref={dialogo}
        className="dialogo dialogo--confirmar"
        onCancel={(e) => { e.preventDefault(); responder(false) }}
        aria-labelledby="confirmar-titulo"
      >
        {pedido && (
          <div className="dialogo__cuerpo">
            <h2 id="confirmar-titulo" className="dialogo__titulo">{pedido.titulo}</h2>
            {pedido.mensaje && <p className="dialogo__texto">{pedido.mensaje}</p>}
            <div className="dialogo__acciones">
              <button type="button" className="boton boton--fantasma" onClick={() => responder(false)} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className={`boton ${pedido.peligro ? 'boton--peligro-lleno' : 'boton--primario'}`}
                onClick={() => responder(true)}
              >
                {pedido.confirmar}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </Contexto.Provider>
  )
}

export function useConfirmar() {
  const confirmar = useContext(Contexto)
  if (!confirmar) throw new Error('useConfirmar debe usarse dentro de ConfirmarProvider')
  return confirmar
}
