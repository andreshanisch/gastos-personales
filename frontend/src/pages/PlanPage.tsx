import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import { SelectorMes } from '../components/SelectorMes'
import { formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import { calcularDesdeHoy, calcularPlan, type Decision, type EntradaPlan, type SemanaPlan } from '../plan'
import type { Categoria, Gasto, Ingreso, PlanMes } from '../types'

interface Datos {
  categorias: Categoria[]
  gastos: Gasto[]
  ingresos: Ingreso[]
  plan: PlanMes
}

const pesos = (n: number) => formatearMonto(Math.round(n))

/** 'mes' = plan de todo el mes; un número = repartir lo que hay hoy en esa cantidad de semanas */
type Modo = 'mes' | 1 | 2 | 3 | 4
const CLAVE_MODO = 'gastos.plan.modo'

function leerModo(): Modo {
  try {
    const valor = localStorage.getItem(CLAVE_MODO)
    if (valor === '1' || valor === '2' || valor === '3' || valor === '4') return Number(valor) as Modo
  } catch { /* sin almacenamiento: se usa el plan del mes */ }
  return 'mes'
}

function guardarModo(modo: Modo) {
  try { localStorage.setItem(CLAVE_MODO, String(modo)) } catch { /* no pasa nada si no se guarda */ }
}

export function PlanPage() {
  const { anio, mes } = useMes()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState('')
  const [eligiendo, setEligiendo] = useState(false)
  const [modo, setModo] = useState<Modo>(leerModo)

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    guardarModo(nuevo)
  }

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [categorias, gastos, ingresos, plan] = await Promise.all([
        api.categorias(),
        api.gastos(anio, mes),
        api.ingresos(anio, mes),
        api.plan(anio, mes),
      ])
      setDatos({ categorias, gastos, ingresos, plan })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [anio, mes])

  useEffect(() => {
    setDatos(null)
    setEligiendo(false)
    cargar()
  }, [cargar])

  const obligatorias = useMemo(() => datos?.categorias.filter((c) => c.obligatoria) ?? [], [datos])

  const entradaPlan = useMemo<EntradaPlan | null>(() => {
    if (!datos) return null
    return {
      anio,
      mes,
      hoy: hoyISO(),
      ingresos: datos.ingresos.filter((i) => i.moneda === 'ARS'),
      gastos: datos.gastos.filter((g) => g.moneda === 'ARS'),
      obligatorias: new Set(obligatorias.map((c) => c.id)),
      decisiones: new Map(datos.plan.decisiones.map((d) => [d.semana, d.decision])),
    }
  }, [datos, obligatorias, anio, mes])

  const resultado = useMemo(() => (entradaPlan ? calcularPlan(entradaPlan) : null), [entradaPlan])

  // "Lo que tengo hoy, en N semanas": solo para el mes en curso
  const desdeHoy = useMemo(() => {
    if (!entradaPlan || !resultado || modo === 'mes') return null
    return calcularDesdeHoy(entradaPlan, modo, resultado.ahorrado)
  }, [entradaPlan, resultado, modo])

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
  const actual = desdeHoy
    ? desdeHoy.semanas[0]
    : resultado.semanaActual ? resultado.semanas[resultado.semanaActual - 1] : null
  const semanasVisibles = desdeHoy ? desdeHoy.semanas : resultado.semanas
  const maximoSemanas = resultado.semanaActual ? 5 - resultado.semanaActual : 0
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

      {resultado.semanaActual !== null && (
        <div className="selector-modo">
          <p className="selector-modo__pregunta" id="modo-titulo">¿Cómo querés administrar la plata?</p>
          <div className="segmentado segmentado--ancho" role="radiogroup" aria-labelledby="modo-titulo">
            <button
              type="button"
              role="radio"
              aria-checked={modo === 'mes' || !desdeHoy}
              className="segmentado__opcion"
              onClick={() => cambiarModo('mes')}
            >
              Todo el mes
            </button>
            {[1, 2, 3, 4].filter((n) => n <= maximoSemanas).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={desdeHoy?.semanasElegidas === n}
                className="segmentado__opcion"
                onClick={() => cambiarModo(n as Modo)}
              >
                {n === 1 ? '1 semana' : `${n} semanas`}
              </button>
            ))}
          </div>
          <p className="selector-modo__ayuda">
            {desdeHoy
              ? <>Reparte lo que tenés hoy en {desdeHoy.semanasElegidas === 1 ? 'esta semana' : `${desdeHoy.semanasElegidas} semanas`}, hasta el {desdeHoy.cubreHasta} de {nombreMes(mes)}.
                {desdeHoy.porCobrar > 0 && <> No cuenta {pesos(desdeHoy.porCobrar)} de ingresos que todavía no cobraste.</>}</>
              : 'Reparte todos los ingresos del mes en 4 semanas, cada uno desde la fecha en que entra.'}
          </p>
        </div>
      )}

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

      {/* ---------- Números ---------- */}
      {desdeHoy ? (
        <dl className="cifras cifras--plan">
          <div>
            <dt>Cobrado hasta hoy</dt>
            <dd>{pesos(desdeHoy.cobrado)}</dd>
          </div>
          <div>
            <dt>Obligatorios pagados</dt>
            <dd>{pesos(desdeHoy.obligatoriosPagados)}</dd>
          </div>
          {desdeHoy.gastadoAntes > 0 && (
            <div>
              <dt>Gastado en semanas anteriores</dt>
              <dd>{pesos(desdeHoy.gastadoAntes)}</dd>
            </div>
          )}
          {desdeHoy.ahorrado > 0 && (
            <div>
              <dt>Ahorrado este mes</dt>
              <dd className="cifras__positivo">{pesos(desdeHoy.ahorrado)}</dd>
            </div>
          )}
          <div>
            <dt>Para repartir desde esta semana</dt>
            <dd>{pesos(desdeHoy.disponible)}</dd>
          </div>
        </dl>
      ) : (
      <dl className="cifras cifras--plan">
        <div>
          <dt>Ingresos</dt>
          <dd>{pesos(resultado.ingresos)}</dd>
        </div>
        <div>
          <dt>Obligatorios pagados</dt>
          <dd>{pesos(resultado.obligatoriosPagados)}</dd>
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
      )}

      {!desdeHoy && resultado.obligatoriosSinCubrir > 0 && (
        <p className="aviso aviso--suave">
          Tus ingresos de {nombreMes(mes)} no alcanzan para los gastos obligatorios que pagaste: faltan {pesos(resultado.obligatoriosSinCubrir)}.
        </p>
      )}
      {!desdeHoy && resultado.excesoSinCubrir > 0 && (
        <p className="aviso aviso--suave">
          En la última semana te pasaste por {pesos(resultado.excesoSinCubrir)} y ya no quedan semanas para compensarlo.
        </p>
      )}

      {/* ---------- Semanas ---------- */}
      <section className="seccion-plan">
        <h2 className="seccion-titulo">Semana por semana</h2>
        <ol className="semanas">
          {semanasVisibles.map((s) => (
            <FilaSemana key={s.numero} semana={s} mes={mes} alCambiarDecision={() => decidir(s.numero, null)} />
          ))}
        </ol>
        {desdeHoy && desdeHoy.cubreHasta < resultado.semanas[3].hasta && (
          <p className="semanas__fin">
            Después del {desdeHoy.cubreHasta} de {nombreMes(mes)} no hay plata asignada: queda para tu próximo ingreso.
          </p>
        )}
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
            Se toman de lo que cargás en Gastos en estas categorías. Cada pago se descuenta de la semana en que lo hiciste
            y de las siguientes, en partes iguales; las semanas anteriores no cambian.
          </p>
          <ul className="obligatorias">
            {obligatorias.map((c) => {
              const pagado = resultado.obligatorias.find((o) => o.categoriaId === c.id)?.pagado ?? 0
              return (
                <li key={c.id} className="obligatoria">
                  <span className="gasto__punto" style={{ background: c.color }} aria-hidden="true" />
                  <span className="obligatoria__nombre">{c.nombre}</span>
                  <span className={`obligatoria__pagado ${pagado === 0 ? 'obligatoria__pagado--cero' : ''}`}>
                    {pagado === 0 ? 'Sin pagos todavía' : pesos(pagado)}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="seccion-plan__pie">
            <span>Total pagado: <strong>{pesos(resultado.obligatoriosPagados)}</strong></span>
            <Link to="/gastos" className="boton boton--secundario">Cargar un gasto</Link>
          </div>
        </section>
      )}

      <p className="nota-plan">Los ingresos y gastos en dólares no entran en el plan.</p>
    </>
  )
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
        {primeraVez && ' Lo que pagues en ellas se descuenta del plan y el resto de tus ingresos se reparte entre las semanas.'}
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
