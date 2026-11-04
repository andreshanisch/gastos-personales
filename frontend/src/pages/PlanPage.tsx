import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import { SelectorMes } from '../components/SelectorMes'
import { formatearMonto, hoyISO, nombreMes, parsearMonto } from '../formato'
import { useMes } from '../MesContext'
import { calcularPlan, type Decision, type SemanaPlan } from '../plan'
import type { Categoria, Gasto, Ingreso, PlanMes, ResumenMensual } from '../types'

interface Datos {
  categorias: Categoria[]
  gastos: Gasto[]
  ingresos: Ingreso[]
  plan: PlanMes
  planAnterior: PlanMes
  resumenAnterior: ResumenMensual
}

type OrigenEstimado = 'guardado' | 'mes-anterior' | 'gastado-mes-anterior' | 'sin-datos'

const pesos = (n: number) => formatearMonto(Math.round(n))

export function PlanPage() {
  const { anio, mes } = useMes()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState('')
  const [eligiendo, setEligiendo] = useState(false)
  const [borradores, setBorradores] = useState<Map<number, string>>(new Map())
  const [guardando, setGuardando] = useState(false)

  const mesAnterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [categorias, gastos, ingresos, plan, planAnterior, resumenAnterior] = await Promise.all([
        api.categorias(),
        api.gastos(anio, mes),
        api.ingresos(anio, mes),
        api.plan(anio, mes),
        api.plan(mesAnterior.anio, mesAnterior.mes),
        api.resumen(mesAnterior.anio, mesAnterior.mes),
      ])
      setDatos({ categorias, gastos, ingresos, plan, planAnterior, resumenAnterior })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setDatos(null)
    setBorradores(new Map())
    setEligiendo(false)
    cargar()
  }, [cargar])

  const obligatorias = useMemo(() => datos?.categorias.filter((c) => c.obligatoria) ?? [], [datos])

  /** Monto estimado de cada obligatoria y de dónde sale */
  const estimados = useMemo(() => {
    const mapa = new Map<number, { monto: number; origen: OrigenEstimado }>()
    if (!datos) return mapa
    for (const c of obligatorias) {
      const guardado = datos.plan.presupuestos.find((p) => p.categoriaId === c.id)
      const anterior = datos.planAnterior.presupuestos.find((p) => p.categoriaId === c.id)
      const gastado = datos.resumenAnterior.porCategoria.find((p) => p.categoriaId === c.id)?.totalARS ?? 0
      if (guardado) mapa.set(c.id, { monto: guardado.monto, origen: 'guardado' })
      else if (anterior) mapa.set(c.id, { monto: anterior.monto, origen: 'mes-anterior' })
      else if (gastado > 0) mapa.set(c.id, { monto: gastado, origen: 'gastado-mes-anterior' })
      else mapa.set(c.id, { monto: 0, origen: 'sin-datos' })
    }
    return mapa
  }, [datos, obligatorias])

  /** Lo que se usa en el cálculo: lo que se está escribiendo, o el estimado */
  const montoDe = useCallback((id: number) => {
    const borrador = borradores.get(id)
    // Vacío, "0" o un texto que no es un monto cuentan como 0
    if (borrador !== undefined) return parsearMonto(borrador) ?? 0
    return estimados.get(id)?.monto ?? 0
  }, [borradores, estimados])

  const resultado = useMemo(() => {
    if (!datos) return null
    return calcularPlan({
      anio,
      mes,
      hoy: hoyISO(),
      ingresos: datos.ingresos.filter((i) => i.moneda === 'ARS'),
      gastos: datos.gastos.filter((g) => g.moneda === 'ARS'),
      obligatorias: new Map(obligatorias.map((c) => [c.id, montoDe(c.id)])),
      decisiones: new Map(datos.plan.decisiones.map((d) => [d.semana, d.decision])),
    })
  }, [datos, obligatorias, montoDe, anio, mes])

  const hayCambiosSinGuardar = borradores.size > 0 || [...estimados.values()].some((e) => e.origen !== 'guardado' && e.monto > 0)

  async function guardarMontos() {
    setGuardando(true)
    setError('')
    try {
      await api.guardarPresupuestos(anio, mes, obligatorias.map((c) => ({ categoriaId: c.id, monto: montoDe(c.id) })))
      setBorradores(new Map())
      await cargar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function decidir(semana: number, decision: Decision | null) {
    setError('')
    try {
      await api.guardarDecision(anio, mes, semana, decision)
      await cargar()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (error && !datos) {
    return (
      <>
        <SelectorMes />
        <div className="aviso" role="alert">
          <p>{error}</p>
          <button type="button" className="boton-texto" onClick={cargar}>Reintentar</button>
        </div>
      </>
    )
  }

  if (!datos || !resultado) {
    return (
      <>
        <SelectorMes />
        <p className="cargando">Armando el plan…</p>
      </>
    )
  }

  const sinIngresos = resultado.ingresos === 0
  const sinObligatorias = obligatorias.length === 0
  const actual = resultado.semanaActual ? resultado.semanas[resultado.semanaActual - 1] : null
  // Las decisiones van en orden: repartir el sobrante de una semana cambia lo que le sobra a la siguiente
  const pendientes = resultado.semanas.filter((s) => s.decisionPendiente).slice(0, 1)
  const otrasPendientes = resultado.semanas.filter((s) => s.decisionPendiente).length - pendientes.length

  return (
    <>
      <SelectorMes />

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}

      {/* ---------- Lo principal: cuánto puedo gastar ---------- */}
      <section className="total" aria-label="Lo que podés gastar">
        {actual ? (
          <>
            <p className="total__etiqueta">
              {actual.saldo >= 0 ? 'Esta semana todavía podés gastar' : 'Esta semana te pasaste por'}
            </p>
            <p className={`total__monto ${actual.saldo < 0 ? 'total__monto--excedido' : ''}`}>
              {pesos(Math.abs(actual.saldo))}
            </p>
            <p className="saldo">
              Semana del {actual.desde} al {actual.hasta} de {nombreMes(mes)}: {pesos(actual.asignado)} asignados,
              {' '}{pesos(actual.gastado)} gastados.
            </p>
          </>
        ) : (
          <>
            <p className="total__etiqueta">Libre para gastar en {nombreMes(mes)}</p>
            <p className="total__monto">{pesos(resultado.libre)}</p>
          </>
        )}
      </section>

      {sinIngresos && (
        <div className="tarjeta tarjeta--paso">
          <h2 className="tarjeta__titulo">Primero, tus ingresos</h2>
          <p>El plan reparte lo que ingresa en el mes. Cargá tus ingresos de {nombreMes(mes)} con la fecha en que los cobrás.</p>
          <Link to="/ingresos" className="boton boton--primario">Cargar ingresos</Link>
        </div>
      )}

      {(sinObligatorias || eligiendo) && (
        <ElegirObligatorias
          categorias={datos.categorias}
          primeraVez={sinObligatorias}
          alTerminar={async () => { setEligiendo(false); await cargar() }}
          alCancelar={sinObligatorias ? undefined : () => setEligiendo(false)}
        />
      )}

      {/* ---------- Sobrantes que esperan una decisión ---------- */}
      {pendientes.map((s) => (
        <div key={s.numero} className="tarjeta tarjeta--decision" role="status">
          <p>
            A la <strong>semana {s.numero}</strong> (del {s.desde} al {s.hasta}) le sobraron <strong>{pesos(s.saldo)}</strong>.
            ¿Qué hacemos con esa plata?
          </p>
          <div className="tarjeta__acciones">
            <button type="button" className="boton boton--primario" onClick={() => decidir(s.numero, 'Ahorrar')}>
              Guardar como ahorro
            </button>
            {s.numero < 4 && (
              <button type="button" className="boton boton--secundario" onClick={() => decidir(s.numero, 'Repartir')}>
                Sumar a las semanas que quedan
              </button>
            )}
          </div>
          {otrasPendientes > 0 && (
            <p className="tarjeta__nota">
              Después de esta, {otrasPendientes === 1 ? 'queda 1 semana más' : `quedan ${otrasPendientes} semanas más`} por decidir.
            </p>
          )}
        </div>
      ))}

      {/* ---------- Números del mes ---------- */}
      <dl className="cifras cifras--plan">
        <div>
          <dt>Ingresos</dt>
          <dd>{pesos(resultado.ingresos)}</dd>
        </div>
        <div>
          <dt>Reservado para obligatorios</dt>
          <dd>{pesos(resultado.reservaObligatorios)}</dd>
        </div>
        <div>
          <dt>Libre para gastar</dt>
          <dd>{pesos(resultado.libre)}</dd>
        </div>
        <div>
          <dt>Ahorrado este mes</dt>
          <dd className={resultado.ahorrado > 0 ? 'cifras__positivo' : ''}>{pesos(resultado.ahorrado)}</dd>
        </div>
      </dl>

      {resultado.obligatoriosSinCubrir > 0 && (
        <p className="aviso aviso--suave">
          Tus ingresos de {nombreMes(mes)} no alcanzan para los gastos obligatorios: faltan {pesos(resultado.obligatoriosSinCubrir)}.
        </p>
      )}
      {resultado.excesoSinCubrir > 0 && (
        <p className="aviso aviso--suave">
          En la última semana te pasaste por {pesos(resultado.excesoSinCubrir)} y ya no quedan semanas para compensarlo.
        </p>
      )}

      {/* ---------- Semanas ---------- */}
      <section className="seccion-plan">
        <h2 className="seccion-titulo">Semana por semana</h2>
        <ol className="semanas">
          {resultado.semanas.map((s) => (
            <FilaSemana key={s.numero} semana={s} mes={mes} alCambiarDecision={() => decidir(s.numero, null)} />
          ))}
        </ol>
      </section>

      {/* ---------- Obligatorios ---------- */}
      {!sinObligatorias && (
        <section className="seccion-plan">
          <div className="seccion-plan__encabezado">
            <h2 className="seccion-titulo">Gastos obligatorios</h2>
            {!eligiendo && (
              <button type="button" className="boton-texto" onClick={() => setEligiendo(true)}>Cambiar categorías</button>
            )}
          </div>
          <p className="seccion-plan__ayuda">
            Se reservan al principio del mes. Si pagás más de lo estimado, la diferencia se descuenta de la semana en que la pagaste.
          </p>
          <ul className="obligatorias">
            {obligatorias.map((c) => {
              const estimado = estimados.get(c.id)!
              const calculo = resultado.obligatorias.find((o) => o.categoriaId === c.id)
              const valor = borradores.get(c.id) ?? (estimado.monto ? Math.round(estimado.monto).toLocaleString('es-AR') : '')
              return (
                <li key={c.id} className="obligatoria">
                  <span className="gasto__punto" style={{ background: c.color }} aria-hidden="true" />
                  <div className="obligatoria__texto">
                    <label htmlFor={`estimado-${c.id}`} className="obligatoria__nombre">{c.nombre}</label>
                    <span className="obligatoria__detalle">
                      Pagado: {pesos(calculo?.pagado ?? 0)}
                      {calculo && calculo.excedente > 0 && <span className="obligatoria__excedente"> ({pesos(calculo.excedente)} más de lo estimado)</span>}
                      {borradores.get(c.id) === undefined && estimado.origen !== 'guardado' && (
                        <span className="obligatoria__sugerido"> {textoOrigen(estimado.origen, nombreMes(mesAnterior.mes))}</span>
                      )}
                    </span>
                  </div>
                  <div className="obligatoria__monto">
                    <span aria-hidden="true">$</span>
                    <input
                      id={`estimado-${c.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      value={valor}
                      onChange={(e) => setBorradores((b) => new Map(b).set(c.id, e.target.value))}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="seccion-plan__pie">
            <span>Total reservado: <strong>{pesos(resultado.reservaObligatorios)}</strong></span>
            <button
              type="button"
              className="boton boton--primario"
              onClick={guardarMontos}
              disabled={guardando || !hayCambiosSinGuardar}
            >
              {guardando ? 'Guardando…' : 'Guardar montos'}
            </button>
          </div>
        </section>
      )}

      <p className="nota-plan">Los ingresos y gastos en dólares no entran en el plan.</p>
    </>
  )
}

function textoOrigen(origen: OrigenEstimado, mesAnterior: string) {
  switch (origen) {
    case 'mes-anterior': return `Sugerido: el monto que usaste en ${mesAnterior}.`
    case 'gastado-mes-anterior': return `Sugerido: lo que gastaste en ${mesAnterior}.`
    case 'sin-datos': return 'Escribí cuánto calculás pagar este mes.'
    default: return ''
  }
}

const ESTADOS: Record<SemanaPlan['estado'], string> = {
  terminada: 'Terminada',
  'en-curso': 'En curso',
  proxima: 'Próxima',
}

function FilaSemana({ semana: s, mes, alCambiarDecision }: { semana: SemanaPlan; mes: number; alCambiarDecision: () => void }) {
  const usado = s.asignado > 0 ? Math.min(100, (s.gastado / s.asignado) * 100) : s.gastado > 0 ? 100 : 0
  return (
    <li className={`semana semana--${s.estado} ${s.saldo < 0 ? 'semana--excedida' : ''}`}>
      <div className="semana__encabezado">
        <h3 className="semana__titulo">Semana {s.numero}</h3>
        <span className="semana__fechas">del {s.desde} al {s.hasta} de {nombreMes(mes)}</span>
        <span className={`etiqueta etiqueta--${s.estado}`}>{ESTADOS[s.estado]}</span>
      </div>

      <div className="semana__montos">
        <div>
          <span className="semana__rotulo">Para gastar</span>
          <span className="semana__cifra">{pesos(s.asignado)}</span>
        </div>
        <div>
          <span className="semana__rotulo">Gastado</span>
          <span className="semana__cifra">{pesos(s.gastado)}</span>
        </div>
        <div>
          <span className="semana__rotulo">{s.saldo >= 0 ? (s.estado === 'terminada' ? 'Sobró' : 'Queda') : 'Te pasaste'}</span>
          <span className={`semana__cifra ${s.saldo < 0 ? 'semana__cifra--negativa' : ''}`}>{pesos(Math.abs(s.saldo))}</span>
        </div>
      </div>

      <div className="semana__barra" aria-hidden="true">
        <span style={{ width: `${usado}%` }} />
      </div>

      <p className="semana__nota">
        Hasta el {s.hasta} de {nombreMes(mes)}, en total: <strong>{pesos(s.acumulado)}</strong>.
        {s.ajuste < 0 && ` Incluye ${pesos(-s.ajuste)} menos por excesos de semanas anteriores.`}
        {s.ajuste > 0 && ` Incluye ${pesos(s.ajuste)} más por sobrantes repartidos.`}
        {s.descuentoPorSemanaSiguiente > 0 && ` Se descuentan ${pesos(s.descuentoPorSemanaSiguiente)} de cada semana siguiente.`}
      </p>

      {s.decision && s.estado === 'terminada' && s.saldo > 0 && (
        <p className="semana__decision">
          {s.decision === 'Ahorrar' ? `Guardaste ${pesos(s.saldo)} como ahorro.` : `Repartiste ${pesos(s.saldo)} entre las semanas siguientes.`}
          {' '}<button type="button" className="boton-texto boton-texto--chico" onClick={alCambiarDecision}>Cambiar</button>
        </p>
      )}
    </li>
  )
}

function ElegirObligatorias({ categorias, primeraVez, alTerminar, alCancelar }: {
  categorias: Categoria[]
  primeraVez: boolean
  alTerminar: () => void
  alCancelar?: () => void
}) {
  const [elegidas, setElegidas] = useState(() => new Set(categorias.filter((c) => c.obligatoria).map((c) => c.id)))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      const cambios = categorias.filter((c) => c.obligatoria !== elegidas.has(c.id))
      await Promise.all(cambios.map((c) => api.marcarObligatoria(c.id, elegidas.has(c.id))))
      alTerminar()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <div className="tarjeta tarjeta--paso">
      <h2 className="tarjeta__titulo">¿Qué gastos no podés evitar?</h2>
      <p>
        Marcá las categorías obligatorias, como alquiler, servicios, suscripciones o tarjeta.
        {primeraVez && ' Se les reserva un monto al principio del mes y el resto se reparte entre las semanas.'}
      </p>
      <div className="chips">
        {categorias.map((c) => (
          <label key={c.id} className="chip">
            <input
              type="checkbox"
              checked={elegidas.has(c.id)}
              onChange={() => setElegidas((actual) => {
                const nuevas = new Set(actual)
                if (nuevas.has(c.id)) nuevas.delete(c.id)
                else nuevas.add(c.id)
                return nuevas
              })}
            />
            <span className="chip__punto" style={{ background: c.color }} />
            {c.nombre}
          </label>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="tarjeta__acciones">
        <button type="button" className="boton boton--primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar categorías'}
        </button>
        {alCancelar && <button type="button" className="boton-texto" onClick={alCancelar}>Cancelar</button>}
      </div>
    </div>
  )
}
