import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAcciones } from '../Acciones'
import { api, esFaltaDeConexion } from '../api'
import { formatearMonto } from '../formato'
import { aGasto, enviarPendientes, estaSinConexion, listarPendientes, marcarConexion, suscribir } from '../pendientes'
import { useAvisos } from './Avisos'

const CADA_MS = 20_000

/**
 * Aviso arriba de cada pantalla cuando la compu no contesta o hay gastos cargados en el
 * teléfono que todavía no llegaron. También es quien manda esos pendientes: al abrir la app,
 * al volver a ella y cada 20 segundos mientras haga falta.
 */
export function EstadoConexion() {
  const avisar = useAvisos()
  const { refrescar, editarGasto } = useAcciones()
  const enviando = useRef(false)

  // Una "foto" del estado en texto, para que React compare sin crear objetos nuevos
  const foto = useSyncExternalStore(suscribir, () => `${estaSinConexion()}|${JSON.stringify(listarPendientes())}`)
  const sinConexion = foto.startsWith('true')
  const pendientes = listarPendientes()
  const conError = pendientes.filter((p) => p.error)

  const sincronizar = useCallback(async () => {
    if (enviando.current) return
    enviando.current = true
    try {
      const habiaSinConexion = estaSinConexion()
      if (listarPendientes().some((p) => !p.error)) {
        const enviados = await enviarPendientes(api.enviarGasto, esFaltaDeConexion)
        if (enviados > 0) {
          avisar(enviados === 1 ? 'Se mandó a la compu 1 gasto que tenías pendiente' : `Se mandaron a la compu ${enviados} gastos que tenías pendientes`)
          refrescar()
          return
        }
      }
      if (habiaSinConexion) {
        // Se prueba si la compu volvió; si contesta, se recargan los datos de verdad
        await api.salud()
        if (!estaSinConexion()) refrescar()
      }
    } catch (err) {
      if (!esFaltaDeConexion(err)) marcarConexion(true)
    } finally {
      enviando.current = false
    }
  }, [avisar, refrescar])

  useEffect(() => {
    sincronizar()
    const alVolver = () => { if (document.visibilityState === 'visible') sincronizar() }
    window.addEventListener('online', sincronizar)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('online', sincronizar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [sincronizar])

  const hayQueReintentar = sinConexion || pendientes.some((p) => !p.error)
  useEffect(() => {
    if (!hayQueReintentar) return
    const id = window.setInterval(sincronizar, CADA_MS)
    return () => window.clearInterval(id)
  }, [hayQueReintentar, sincronizar])

  if (!sinConexion && pendientes.length === 0) return null

  const cuantos = pendientes.length === 1 ? '1 gasto pendiente' : `${pendientes.length} gastos pendientes`
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-border bg-card px-4 py-3 text-[13px]"
    >
      <span className="flex items-center gap-2 font-medium">
        <span className={`size-2 shrink-0 rounded-full ${sinConexion ? 'bg-secondary' : 'bg-primary'}`} aria-hidden />
        {sinConexion
          ? 'Sin conexión con la compu: ves lo último guardado en el teléfono.'
          : `${cuantos} en el teléfono.`}
      </span>
      {sinConexion && pendientes.length > 0 && (
        <span className="text-muted-foreground">
          {cuantos}: {pendientes.length === 1 ? 'se manda solo' : 'se mandan solos'} cuando la compu esté prendida.
        </span>
      )}
      {conError.map((p) => (
        <span key={p.idLocal} className="flex flex-wrap items-center gap-2 text-secondary">
          {formatearMonto(p.datos.monto, p.datos.moneda)} no se pudo mandar: {p.error}
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => editarGasto(aGasto(p))}>
            Corregir
          </button>
        </span>
      ))}
      {!sinConexion && pendientes.some((p) => !p.error) && (
        <button type="button" className="ml-auto font-semibold text-primary hover:underline" onClick={sincronizar}>
          Mandar ahora
        </button>
      )}
    </div>
  )
}
