import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { Guilloche } from '../components/Guilloche'
import { Monto } from '../components/Monto'
import { formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import { calcularDesdeHoy, calcularPlan, type Decision, type EntradaPlan, type SemanaPlan } from '../plan'
import { alTeclaEnGrupo } from '../teclado'
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
/** Hasta qué semana se repartió "lo que tengo hoy" la última vez, para volver a eso al elegirlo */
const CLAVE_SEMANAS = 'gastos.plan.semanas'

function leerNumero(clave: string): 1 | 2 | 3 | 4 | null {
  try {
    const valor = localStorage.getItem(clave)
    if (valor === '1' || valor === '2' || valor === '3' || valor === '4') return Number(valor) as 1 | 2 | 3 | 4
  } catch { /* sin almacenamiento: se usa el valor por defecto */ }
  return null
}

function guardarPreferencia(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor) } catch { /* no pasa nada si no se guarda */ }
}

export function PlanPage() {
  const { anio, mes } = useMes()
  const { version, nuevoGasto, nuevoIngreso } = useAcciones()
  const avisar = useAvisos()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState('')
  const [eligiendo, setEligiendo] = useState(false)
  const [modo, setModo] = useState<Modo>(() => leerNumero(CLAVE_MODO) ?? 'mes')

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    guardarPreferencia(CLAVE_MODO, String(nuevo))
    if (nuevo !== 'mes') guardarPreferencia(CLAVE_SEMANAS, String(nuevo))
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
  }, [anio, mes])

  // Se vuelve a cargar al cambiar de mes y cada vez que se guarda un gasto o ingreso desde cualquier lado
  useEffect(() => { cargar() }, [cargar, version])

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
      if (decision === 'Ahorrar') avisar('Guardado como ahorro')
      if (decision === 'Repartir') avisar('Sumado a las semanas que quedan')
      await cargar()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const encabezado = (
    <EncabezadoPagina
      titulo="Plan"
      subtitulo="Cuánto podés gastar, semana por semana."
      conMes
    />
  )

  if (error && !datos) {
    return (
      <>
        {encabezado}
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
        {encabezado}
        <Esqueleto filas={3} />
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
  const usadoActual = actual && actual.asignado > 0 ? Math.min(100, (actual.gastado / actual.asignado) * 100) : actual?.gastado ? 100 : 0

  // Cuánto se puede gastar por día en lo que queda de la semana actual
  const diasRestantes = actual && actual.estado === 'en-curso'
    ? actual.hasta - Number(hoyISO().slice(8, 10)) + 1
    : 0
  const porDia = actual && diasRestantes > 0 && actual.saldo > 0 ? actual.saldo / diasRestantes : 0

  // La semana que sigue a la actual en el plan del mes: ya trae descontado el exceso de esta
  const siguiente = !desdeHoy && actual && actual.numero < 4 ? resultado.semanas[actual.numero] : null

  // Lo que queda para el resto del período que se está mirando (puede ser negativo si se pasó)
  const gastadoComun = semanasVisibles.reduce((s, x) => s + x.gastado, 0)
  const queda = desdeHoy
    ? desdeHoy.disponible - gastadoComun
    : resultado.libre - gastadoComun - resultado.ahorrado

  // Hasta qué día puede llegar "lo que tengo hoy": el fin de cada semana desde la actual
  const finesPosibles = resultado.semanaActual
    ? resultado.semanas.slice(resultado.semanaActual - 1).map((s, i) => ({ semanas: (i + 1) as 1 | 2 | 3 | 4, hasta: s.hasta }))
    : []
  const semanasHoy = (desdeHoy?.semanasElegidas ?? Math.max(1, Math.min(leerNumero(CLAVE_SEMANAS) ?? maximoSemanas, maximoSemanas))) as 1 | 2 | 3 | 4

  return (
    <>
      {encabezado}

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}

      {/* ---------- Lo principal: cuánto puedo gastar ---------- */}
      <section className="billete" aria-labelledby="billete-titulo">
        <Guilloche />
        {/* Cuando cambia el monto (otro mes, otro modo, un gasto nuevo) el lector de pantalla lo lee entero */}
        <div aria-live="polite" aria-atomic="true">
          {actual ? (
            <>
              <h2 className="billete__etiqueta" id="billete-titulo">
                {actual.saldo >= 0 ? 'Esta semana todavía podés gastar' : 'Esta semana te pasaste por'}
              </h2>
              <Monto
                valor={Math.abs(actual.saldo)}
                className={`billete__monto ${actual.saldo < 0 ? 'billete__monto--excedido' : ''}`}
              />
              <p className="billete__dia">
                {porDia > 0
                  ? <>Son unos <strong>{pesos(porDia)}</strong> por día hasta el {actual.hasta} de {nombreMes(mes)}.</>
                  : actual.saldo < 0
                    ? siguiente
                      ? <>Desde el {siguiente.desde} tenés <strong>{pesos(Math.max(0, siguiente.asignado))}</strong> para esa semana, ya descontado el exceso.</>
                      : desdeHoy
                        ? <>Te {queda >= 0 ? 'quedan' : 'faltan'} <strong>{pesos(Math.abs(queda))}</strong> hasta el {desdeHoy.cubreHasta} de {nombreMes(mes)}.</>
                        : 'Es la última semana: ya no quedan semanas para compensarlo.'
                    : `Semana del ${actual.desde} al ${actual.hasta} de ${nombreMes(mes)}.`}
              </p>
              <div className={`billete__barra ${actual.saldo < 0 ? 'billete__barra--excedida' : ''}`} aria-hidden="true">
                <span style={{ width: `${usadoActual}%` }} />
              </div>
              <p className="billete__base">
                {desdeHoy
                  ? 'Según lo que tenés hoy.'
                  : 'Según el plan del mes.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="billete__etiqueta" id="billete-titulo">Libre para gastar en {nombreMes(mes)}</h2>
              <Monto valor={resultado.libre} className="billete__monto" />
              <p className="billete__dia">Ingresos del mes menos los gastos obligatorios.</p>
            </>
          )}
        </div>
        <dl className="billete__lado">
          {actual && (
            <>
              <div className="billete__dato">
                <dt>Para gastar esta semana</dt>
                <dd><Monto valor={actual.asignado} /></dd>
              </div>
              <div className="billete__dato">
                <dt>Ya gastaste</dt>
                <dd><Monto valor={actual.gastado} /></dd>
              </div>
              <div className="billete__dato">
                <dt>
                  {queda >= 0
                    ? desdeHoy ? `Queda hasta el ${desdeHoy.cubreHasta}` : 'Queda en el mes'
                    : desdeHoy ? `Te pasaste hasta el ${desdeHoy.cubreHasta}` : 'Te pasaste en el mes'}
                </dt>
                <dd className={queda < 0 ? 'billete__dato--excedido' : undefined}><Monto valor={Math.abs(queda)} /></dd>
              </div>
            </>
          )}
          {(!actual || resultado.ahorrado > 0) && (
            <div className="billete__dato">
              <dt>Ahorrado este mes</dt>
              <dd><Monto valor={resultado.ahorrado} /></dd>
            </div>
          )}
        </dl>
      </section>

      {resultado.semanaActual !== null && (
        <>
          <div className="modo">
            <p className="modo__pregunta" id="modo-titulo">Calcular con</p>
            <div className="segmentado" role="radiogroup" aria-labelledby="modo-titulo" onKeyDown={alTeclaEnGrupo}>
              <button
                type="button"
                role="radio"
                aria-checked={!desdeHoy}
                tabIndex={!desdeHoy ? 0 : -1}
                className="segmentado__opcion"
                onClick={() => cambiarModo('mes')}
              >
                El plan del mes
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!!desdeHoy}
                tabIndex={desdeHoy ? 0 : -1}
                className="segmentado__opcion"
                onClick={() => cambiarModo(semanasHoy)}
              >
                Lo que tengo hoy
              </button>
            </div>
            {desdeHoy && finesPosibles.length > 1 && (
              <label className="modo__hasta">
                <span>repartido hasta el</span>
                <select value={desdeHoy.semanasElegidas} onChange={(e) => cambiarModo(Number(e.target.value) as Modo)}>
                  {finesPosibles.map((f) => (
                    <option key={f.semanas} value={f.semanas}>
                      {f.hasta} de {nombreMes(mes)}{f.semanas === 1 ? ' (fin de esta semana)' : f.semanas === finesPosibles.length ? ' (fin de mes)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="modo__ayuda">
            {desdeHoy
              ? <>Reparte en partes iguales lo que tenés hoy ({pesos(desdeHoy.disponible)}): lo cobrado menos los obligatorios, lo gastado en semanas anteriores y lo ahorrado.
                {desdeHoy.porCobrar > 0 && <> No cuenta {pesos(desdeHoy.porCobrar)} que todavía no cobraste.</>}</>
              : 'Reparte todos los ingresos del mes entre las 4 semanas, cada uno desde la semana en que entra.'}
          </p>
        </>
      )}

      {sinIngresos && (
        <div className="tarjeta tarjeta--paso">
          <h2 className="tarjeta__titulo">Empezá cargando tus ingresos</h2>
          <p className="tarjeta__texto">El plan reparte lo que ingresa en el mes. Cargá tus ingresos de {nombreMes(mes)} con la fecha en que los cobrás.</p>
          <div className="tarjeta__acciones">
            <button type="button" className="boton boton--primario" onClick={nuevoIngreso}>Cargar un ingreso</button>
            <Link to="/ingresos" className="boton-texto">Ver ingresos</Link>
          </div>
        </div>
      )}

      {(sinObligatorias || eligiendo) && (
        <ElegirObligatorias
          categorias={datos.categorias}
          primeraVez={sinObligatorias}
          alTerminar={async () => { setEligiendo(false); avisar('Categorías obligatorias guardadas'); await cargar() }}
          alCancelar={sinObligatorias ? undefined : () => setEligiendo(false)}
        />
      )}

      {/* ---------- Sobrantes que esperan una decisión ---------- */}
      {pendientes.map((s) => (
        <div key={s.numero} className="tarjeta tarjeta--decision" role="status">
          <h2 className="tarjeta__titulo">Te sobraron {pesos(s.saldo)} de la semana {s.numero}</h2>
          <p className="tarjeta__texto">Del {s.desde} al {s.hasta} de {nombreMes(mes)} gastaste menos de lo planeado. ¿Qué hacemos con esa plata?</p>
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
              Después, {otrasPendientes === 1 ? 'queda 1 semana más' : `quedan ${otrasPendientes} semanas más`} por decidir.
            </p>
          )}
        </div>
      ))}

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
      <section className="seccion" aria-labelledby="titulo-semanas">
        <h2 className="seccion__titulo" id="titulo-semanas">Semana por semana</h2>
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

      {/* ---------- Números del mes y obligatorios ---------- */}
      <div className="plan-columnas">
        <section className="panel" aria-labelledby="titulo-numeros">
          <div className="panel__encabezado">
            <h2 className="panel__titulo" id="titulo-numeros">{desdeHoy ? 'Lo que tenés hoy' : `Números de ${nombreMes(mes)}`}</h2>
          </div>
          <ul className="lista-datos">
            {desdeHoy ? (
              <>
                <FilaDato nombre="Cobrado hasta hoy" valor={desdeHoy.cobrado} />
                <FilaDato nombre="Obligatorios pagados" valor={-desdeHoy.obligatoriosPagados} />
                {desdeHoy.gastadoAntes > 0 && <FilaDato nombre="Gastado en semanas anteriores" valor={-desdeHoy.gastadoAntes} />}
                {desdeHoy.ahorrado > 0 && <FilaDato nombre="Ahorrado" valor={-desdeHoy.ahorrado} />}
                <FilaDato nombre="Para repartir" valor={desdeHoy.disponible} fuerte />
              </>
            ) : (
              <>
                <FilaDato nombre="Ingresos del mes" valor={resultado.ingresos} />
                <FilaDato nombre="Obligatorios pagados" valor={-resultado.obligatoriosPagados} />
                <FilaDato nombre="Libre para gastar" valor={resultado.libre} fuerte />
                {resultado.ahorrado > 0 && <FilaDato nombre="Ahorrado" valor={resultado.ahorrado} positivo />}
              </>
            )}
          </ul>
          <p className="nota">Los ingresos y gastos en dólares no entran en el plan.</p>
        </section>

        {!sinObligatorias && (
          <section className="panel" aria-labelledby="titulo-obligatorios">
            <div className="panel__encabezado">
              <h2 className="panel__titulo" id="titulo-obligatorios">Gastos obligatorios</h2>
              {!eligiendo && (
                <button type="button" className="boton-texto boton-texto--chico" onClick={() => setEligiendo(true)}>Cambiar</button>
              )}
            </div>
            <p className="panel__ayuda">
              Salen de lo que cargás en estas categorías. Cada pago se descuenta desde la semana en que lo hiciste.
            </p>
            <ul className="lista-datos">
              {obligatorias.map((c) => {
                const pagado = resultado.obligatorias.find((o) => o.categoriaId === c.id)?.pagado ?? 0
                return (
                  <li key={c.id}>
                    <span className="fila__punto" style={{ background: c.color }} aria-hidden="true" />
                    <span className="lista-datos__nombre">{c.nombre}</span>
                    {pagado === 0
                      ? <span className="lista-datos__vacio">Sin pagos todavía</span>
                      : <Monto valor={pagado} className="lista-datos__valor" />}
                  </li>
                )
              })}
            </ul>
            <div className="panel__pie">
              <span>Total: <Monto valor={resultado.obligatoriosPagados} className="lista-datos__valor lista-datos__valor--fuerte" /></span>
              <button type="button" className="boton boton--secundario boton--chico" onClick={nuevoGasto}>Cargar un pago</button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function FilaDato({ nombre, valor, fuerte = false, positivo = false }: { nombre: string; valor: number; fuerte?: boolean; positivo?: boolean }) {
  return (
    <li>
      <span className="lista-datos__nombre">{fuerte ? <strong>{nombre}</strong> : nombre}</span>
      <Monto
        valor={valor}
        conSigno
        className={`lista-datos__valor ${fuerte ? 'lista-datos__valor--fuerte' : ''} ${positivo ? 'lista-datos__positivo' : ''}`}
      />
    </li>
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
        <span className="semana__fechas">{s.desde} al {s.hasta} de {nombreMes(mes)}</span>
        <span className={`etiqueta etiqueta--${s.estado}`}>{ESTADOS[s.estado]}</span>
      </div>

      <div className="semana__montos">
        <div>
          <span className="semana__rotulo">Para gastar</span>
          <Monto valor={s.asignado} className="semana__cifra" />
        </div>
        <div>
          <span className="semana__rotulo">Gastado</span>
          <Monto valor={s.gastado} className="semana__cifra" />
        </div>
        <div>
          <span className="semana__rotulo">{s.saldo >= 0 ? (s.estado === 'terminada' ? 'Sobró' : 'Queda') : 'Te pasaste'}</span>
          <Monto valor={Math.abs(s.saldo)} className={`semana__cifra ${s.saldo < 0 ? 'semana__cifra--negativa' : ''}`} />
        </div>
      </div>

      <div className="semana__barra" aria-hidden="true">
        <span style={{ width: `${usado}%` }} />
      </div>

      <p className="semana__nota">
        Acumulado al {s.hasta}: <strong>{pesos(s.acumulado)}</strong>.
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
      <p className="tarjeta__texto">
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
