import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { useAcciones } from '../Acciones'
import { api } from '../api'
import { useAvisos } from '../components/Avisos'
import { EncabezadoPagina } from '../components/EncabezadoPagina'
import { Esqueleto } from '../components/Esqueleto'
import { EASE, Insignia, Pills, Tile, useMounted } from '@/components/ui/bento'
import { Cifra } from '@/components/ui/cifra'
import { cn } from '@/lib/utils'
import { capitalizar, formatearMonto, hoyISO, nombreMes } from '../formato'
import { useMes } from '../MesContext'
import { calcularDesdeHoy, calcularPlan, semanaDelDia, type Decision, type EntradaPlan, type SemanaPlan } from '../plan'
import { armarEntrada, CLAVE_MODO, CLAVE_SEMANAS, guardarPreferencia, leerNumero, type Modo } from '../semana'
import type { Categoria, Gasto, Ingreso, PlanMes } from '../types'

interface Datos {
  categorias: Categoria[]
  gastos: Gasto[]
  ingresos: Ingreso[]
  plan: PlanMes
}

const pesos = (n: number) => formatearMonto(Math.round(n))
const LIMA = 'var(--primary)'
const LILA = 'var(--secondary)'

export function PlanPage() {
  const { anio, mes } = useMes()
  const { version, nuevoGasto, nuevoIngreso, editarGasto } = useAcciones()
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
  const entradaPlan = useMemo<EntradaPlan | null>(() => (datos ? armarEntrada(anio, mes, datos) : null), [datos, anio, mes])
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

  const esMesEnCurso = resultado?.semanaActual != null
  const maximoSemanas = resultado?.semanaActual ? 5 - resultado.semanaActual : 0
  const semanasHoy = (desdeHoy?.semanasElegidas ?? Math.max(1, Math.min(leerNumero(CLAVE_SEMANAS) ?? maximoSemanas, maximoSemanas))) as 1 | 2 | 3 | 4
  // Hasta qué día puede llegar "lo que tengo hoy": el fin de cada semana desde la actual
  const finesPosibles = resultado?.semanaActual
    ? resultado.semanas.slice(resultado.semanaActual - 1).map((s, i) => ({ semanas: (i + 1) as 1 | 2 | 3 | 4, hasta: s.hasta }))
    : []

  const encabezado = (
    <EncabezadoPagina
      titulo="Plan"
      subtitulo="Cuánto podés gastar, semana por semana."
      conMes
      acciones={esMesEnCurso && (
        <div className="flex flex-wrap items-center gap-2">
          <span id="calcular-con" className="text-[13px] text-muted-foreground">Calcular con</span>
          <Pills
            etiqueta="Calcular con"
            valor={desdeHoy ? 'hoy' : 'mes'}
            opciones={[{ valor: 'mes', texto: 'El plan del mes' }, { valor: 'hoy', texto: 'Lo que tengo hoy' }]}
            alCambiar={(v) => cambiarModo(v === 'mes' ? 'mes' : semanasHoy)}
          />
          {desdeHoy && finesPosibles.length > 1 && (
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              hasta el
              <select
                value={desdeHoy.semanasElegidas}
                onChange={(e) => cambiarModo(Number(e.target.value) as Modo)}
                className="h-8 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {finesPosibles.map((f) => (
                  <option key={f.semanas} value={f.semanas}>
                    {f.hasta} de {nombreMes(mes)}{f.semanas === 1 ? ' (fin de semana)' : f.semanas === finesPosibles.length ? ' (fin de mes)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
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
  // Las decisiones van en orden: repartir el sobrante de una semana cambia lo que le sobra a la siguiente
  const pendientes = resultado.semanas.filter((s) => s.decisionPendiente)

  // Cuánto se puede gastar por día en lo que queda de la semana actual
  const hoyDia = Number(hoyISO().slice(8, 10))
  const diasRestantes = actual && actual.estado === 'en-curso' ? actual.hasta - hoyDia + 1 : 0
  const porDia = actual && diasRestantes > 0 && actual.saldo > 0 ? actual.saldo / diasRestantes : 0
  // La semana que sigue a la actual: ya trae descontado el exceso de esta
  const siguiente = desdeHoy
    ? desdeHoy.semanas[1] ?? null
    : actual && actual.numero < 4 ? resultado.semanas[actual.numero] : null

  // Lo que queda para el resto del período que se está mirando (puede ser negativo si se pasó)
  const gastadoComun = semanasVisibles.reduce((s, x) => s + x.gastado, 0)
  const queda = desdeHoy
    ? desdeHoy.disponible - gastadoComun
    : resultado.libre - gastadoComun - resultado.ahorrado
  const totalPeriodo = desdeHoy ? desdeHoy.disponible : resultado.libre - resultado.ahorrado

  // Un mes que ya terminó no se planifica: se resume cómo cerró
  const [anioHoy, mesHoy] = hoyISO().split('-').map(Number)
  const mesCerrado = anio * 100 + mes < anioHoy * 100 + mesHoy
  const gastadoMes = resultado.semanas.reduce((s, x) => s + x.gastado, 0)
  const balance = resultado.ingresos - resultado.obligatoriosPagados - gastadoMes
  const sinMovimientos = resultado.ingresos === 0 && resultado.obligatoriosPagados === 0 && gastadoMes === 0
  const vacioCerrado = mesCerrado && sinMovimientos

  // Cuando las semanas que vienen tienen el mismo ajuste, se explica una sola vez al pie
  const futurasConAjuste = semanasVisibles.filter((s) => s.estado === 'proxima' && Math.round(s.ajuste) !== 0)
  const ajusteComun = futurasConAjuste.length >= 2 && futurasConAjuste.every((s) => Math.round(s.ajuste) === Math.round(futurasConAjuste[0].ajuste))
    ? futurasConAjuste[0].ajuste
    : null

  return (
    <>
      {encabezado}

      {error && <div className="aviso" role="alert"><p>{error}</p></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* ---------- Lo principal: cuánto puedo gastar, y cómo fue cada día ---------- */}
        <Tile className="sm:col-span-2 lg:col-span-2" aria-labelledby="titulo-principal">
          <div aria-live="polite" aria-atomic="true">
            {actual ? (
              <>
                <h2 id="titulo-principal" className="text-[13px] font-medium text-muted-foreground">
                  {actual.saldo >= 0 ? 'Esta semana te quedan' : 'Esta semana te pasaste por'}
                </h2>
                <Cifra
                  valor={actual.saldo}
                  animar
                  className={cn('mt-1 block text-[46px] font-semibold leading-none tracking-[-0.04em] sm:text-[56px]', actual.saldo < 0 && 'text-secondary')}
                />
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {porDia > 0
                    ? <>Son unos <span className="font-mono text-foreground">{pesos(porDia)}</span> por día hasta el {actual.hasta}.</>
                    : actual.saldo < 0
                      ? siguiente
                        ? <>Desde el {siguiente.desde} tenés <span className="font-mono text-foreground">{pesos(Math.max(0, siguiente.asignado))}</span> para esa semana, ya descontado el exceso.</>
                        : 'Ya no quedan semanas para compensarlo.'
                      : `Semana del ${actual.desde} al ${actual.hasta}.`}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Semana {actual.numero}, del {actual.desde} al {actual.hasta} de {nombreMes(mes)} · {desdeHoy ? 'según lo que tenés hoy' : 'según el plan del mes'}
                </p>
              </>
            ) : mesCerrado ? (
              <div>
                <h2 id="titulo-principal" className="text-[12px] text-muted-foreground">
                  {sinMovimientos
                    ? `Sin movimientos en ${nombreMes(mes)}`
                    : balance >= 0 ? `En ${nombreMes(mes)} te sobraron` : `En ${nombreMes(mes)} te pasaste por`}
                </h2>
                <Cifra valor={balance} animar className={cn('text-[40px] font-semibold leading-none tracking-[-0.04em]', balance < 0 && 'text-secondary')} />
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {sinMovimientos
                    ? 'No cargaste ingresos ni gastos en este mes.'
                    : 'Lo que ingresó menos los gastos obligatorios y los demás gastos del mes.'}
                </p>
              </div>
            ) : (
              <div>
                <h2 id="titulo-principal" className="text-[12px] text-muted-foreground">Libre para gastar en {nombreMes(mes)}</h2>
                <Cifra valor={resultado.libre} animar className="text-[40px] font-semibold leading-none tracking-[-0.04em]" />
                <p className="mt-1.5 text-[12px] text-muted-foreground">Ingresos del mes menos los gastos obligatorios.</p>
              </div>
            )}
          </div>
          {!vacioCerrado && (
            <TiraDiaria
              anio={anio}
              mes={mes}
              gastos={datos.gastos}
              obligatorias={new Set(obligatorias.map((c) => c.id))}
              semanas={resultado.semanas}
              semanasHoy={desdeHoy?.semanas ?? null}
              hoy={esMesEnCurso ? hoyDia : null}
            />
          )}
        </Tile>

        {actual ? (
          <>
            {/* ---------- Esta semana ---------- */}
            <Tile titulo="Esta semana" accion={<Insignia color={actual.saldo < 0 ? LILA : LIMA}>{actual.saldo < 0 ? 'Te pasaste' : 'En curso'}</Insignia>}>
              <dl className="space-y-3">
                <Dato nombre="Para gastar" valor={actual.asignado} />
                <Dato nombre="Ya gastaste" valor={actual.gastado} />
              </dl>
              <BarraUso asignado={actual.asignado} gastado={actual.gastado} className="mt-4 h-2" etiqueta={`Gastaste ${pesos(actual.gastado)} de ${pesos(actual.asignado)}`} />
              <p className="mt-auto pt-4 text-[12px] text-muted-foreground">
                {actual.descuentoPorSemanaSiguiente > 0
                  ? <>Se descuentan <span className="font-mono text-foreground">{pesos(actual.descuentoPorSemanaSiguiente)}</span> de cada semana que sigue.</>
                  : actual.saldo >= 0 ? `Del ${actual.desde} al ${actual.hasta} de ${nombreMes(mes)}.` : 'El exceso sale de las semanas que quedan.'}
              </p>
            </Tile>

            {/* ---------- Lo que queda del período ---------- */}
            <MedidorQueda
              queda={queda}
              total={totalPeriodo}
              titulo={desdeHoy ? `Queda hasta el ${desdeHoy.cubreHasta}` : 'Queda en el mes'}
            />
          </>
        ) : !vacioCerrado ? (
          <Tile titulo={`Cómo cerró ${nombreMes(mes)}`} className="sm:col-span-2 lg:col-span-2">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Dato nombre="Ingresos" valor={resultado.ingresos} />
              <Dato nombre="Obligatorios" valor={resultado.obligatoriosPagados} />
              <Dato nombre="Otros gastos" valor={gastadoMes} />
            </dl>
            {sinIngresos && (
              <p className="mt-auto pt-4 text-[13px] text-muted-foreground">
                No cargaste ingresos en {nombreMes(mes)}.{' '}
                <button type="button" className="font-semibold text-primary hover:underline" onClick={nuevoIngreso}>Cargar un ingreso</button>
              </p>
            )}
          </Tile>
        ) : null}

        {/* ---------- Pasos pendientes: ingresos y obligatorios ---------- */}
        {sinIngresos && !mesCerrado && (
          <Tile titulo="Primer paso" className="sm:col-span-2 lg:col-span-4">
            <p className="text-lg font-semibold tracking-tight">Empezá cargando tus ingresos</p>
            <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
              El plan reparte lo que ingresa en el mes. Cargá tus ingresos de {nombreMes(mes)} con la fecha en que los cobrás.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="boton boton--primario" onClick={nuevoIngreso}>Cargar un ingreso</button>
              <Link to="/ingresos" className="boton-texto">Ver ingresos</Link>
            </div>
          </Tile>
        )}

        {(sinObligatorias || eligiendo) && (
          <ElegirObligatorias
            categorias={datos.categorias}
            primeraVez={sinObligatorias}
            alTerminar={async () => { setEligiendo(false); avisar('Categorías obligatorias guardadas'); await cargar() }}
            alCancelar={sinObligatorias ? undefined : () => setEligiendo(false)}
          />
        )}

        {!desdeHoy && resultado.obligatoriosSinCubrir > 0 && (
          <p className="aviso aviso--suave !m-0 sm:col-span-2 lg:col-span-4">
            Tus ingresos de {nombreMes(mes)} no alcanzan para los gastos obligatorios que pagaste: faltan {pesos(resultado.obligatoriosSinCubrir)}.
          </p>
        )}
        {!desdeHoy && resultado.excesoSinCubrir > 0 && (
          <p className="aviso aviso--suave !m-0 sm:col-span-2 lg:col-span-4">
            En la última semana te pasaste por {pesos(resultado.excesoSinCubrir)} y ya no quedan semanas para compensarlo.
          </p>
        )}

        {/* ---------- Semanas ---------- */}
        {!vacioCerrado && (
          <Tile titulo="Semana por semana" className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <ol className="flex flex-col divide-y divide-border">
              {semanasVisibles.map((s) => (
                <FilaSemana
                  key={s.numero}
                  semana={s}
                  mes={mes}
                  ocultarAjuste={ajusteComun !== null && s.estado === 'proxima'}
                  alCambiarDecision={() => decidir(s.numero, null)}
                />
              ))}
            </ol>
            {ajusteComun !== null && (
              <p className="mt-auto pt-3 text-[12px] text-muted-foreground">
                Las semanas {futurasConAjuste[0].numero} a {futurasConAjuste[futurasConAjuste.length - 1].numero} tienen{' '}
                <span className="font-mono text-foreground">{pesos(Math.abs(ajusteComun))}</span>{' '}
                {ajusteComun < 0 ? 'menos cada una por excesos de semanas anteriores.' : 'más cada una por sobrantes repartidos.'}
              </p>
            )}
            {desdeHoy && desdeHoy.cubreHasta < resultado.semanas[3].hasta && (
              <p className={cn('pt-3 text-[12px] text-muted-foreground', ajusteComun === null && 'mt-auto')}>
                Después del {desdeHoy.cubreHasta} de {nombreMes(mes)} no hay plata asignada: queda para tu próximo ingreso.
              </p>
            )}
          </Tile>
        )}

        {/* ---------- En qué se va ---------- */}
        <Categorias gastos={datos.gastos} />

        {/* ---------- Ahorro y decisiones sobre sobrantes ---------- */}
        <Ahorro
          ahorrado={resultado.ahorrado}
          pendiente={pendientes[0] ?? null}
          otrasPendientes={Math.max(0, pendientes.length - 1)}
          mes={mes}
          semanas={resultado.semanas}
          alDecidir={decidir}
        />

        {/* ---------- Obligatorios ---------- */}
        {!sinObligatorias && (
          <Tile
            titulo="Gastos obligatorios"
            accion={!eligiendo && (
              <button type="button" className="text-[12px] font-semibold text-primary hover:underline" onClick={() => setEligiendo(true)}>Cambiar</button>
            )}
          >
            <ul className="-my-1">
              {obligatorias.map((c) => {
                const pagado = resultado.obligatorias.find((o) => o.categoriaId === c.id)?.pagado ?? 0
                return (
                  <li key={c.id} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                    {pagado === 0
                      ? <span className="text-[12px] text-muted-foreground">Sin pagos</span>
                      : <Cifra valor={pagado} className="text-[13px] font-medium" />}
                  </li>
                )
              })}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-[12px] text-muted-foreground">
                Total <Cifra valor={resultado.obligatoriosPagados} className="ml-1 text-[13px] font-semibold text-foreground" />
              </span>
              <button type="button" className="boton boton--secundario boton--chico" onClick={nuevoGasto}>Cargar un pago</button>
            </div>
          </Tile>
        )}

        {/* ---------- Números del mes ---------- */}
        <Tile titulo={desdeHoy ? 'Lo que tenés hoy' : `Números de ${nombreMes(mes)}`} className="sm:col-span-2 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {desdeHoy ? (
              <>
                <Dato nombre="Cobrado hasta hoy" valor={desdeHoy.cobrado} />
                <Dato nombre="Obligatorios" valor={desdeHoy.obligatoriosPagados} />
                <Dato nombre="Semanas anteriores" valor={desdeHoy.gastadoAntes} />
                <Dato nombre="Para repartir" valor={desdeHoy.disponible} fuerte />
              </>
            ) : (
              <>
                <Dato nombre="Ingresos del mes" valor={resultado.ingresos} />
                <Dato nombre="Obligatorios" valor={resultado.obligatoriosPagados} />
                <Dato nombre="Libre para gastar" valor={resultado.libre} fuerte />
                <Dato nombre="Ahorrado" valor={resultado.ahorrado} />
              </>
            )}
          </dl>
          <p className="mt-auto pt-4 text-[12px] text-muted-foreground">Los ingresos y gastos en dólares no entran en el plan.</p>
        </Tile>

        {/* ---------- Últimos gastos ---------- */}
        <UltimosGastos gastos={datos.gastos} alEditar={editarGasto} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Piezas                                                             */
/* ------------------------------------------------------------------ */

function Dato({ nombre, valor, fuerte = false }: { nombre: string; valor: number; fuerte?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{nombre}</dt>
      <dd className="mt-0.5">
        <Cifra valor={valor} className={cn('text-[20px] font-semibold tracking-[-0.02em]', fuerte && 'text-primary')} />
      </dd>
    </div>
  )
}

/** Barra de lo gastado sobre lo asignado; si se pasó, muestra aparte en lila el tramo del exceso */
function BarraUso({ asignado, gastado, className, etiqueta }: { asignado: number; gastado: number; className?: string; etiqueta?: string }) {
  const montado = useMounted()
  const exceso = gastado > asignado
  const dentro = exceso ? (asignado > 0 ? (asignado / gastado) * 100 : 0) : asignado > 0 ? (gastado / asignado) * 100 : 0
  const fuera = exceso ? 100 - dentro : 0
  // Primero crece lo que entra en el plan y después, a continuación, el exceso
  const ancho = (p: number) => (montado ? `calc(${p}% - 1.5px)` : '0%')
  return (
    <div
      className={cn('flex gap-[3px] overflow-hidden rounded-full bg-muted', className)}
      {...(etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true })}
    >
      {dentro > 0 && (
        <span className="block h-full shrink-0 rounded-full bg-primary" style={{ width: ancho(dentro), transition: `width 900ms ${EASE}` }} />
      )}
      {exceso && (
        <span className="block h-full shrink-0 rounded-full bg-secondary" style={{ width: ancho(fuera), transition: `width 700ms ${EASE} 500ms` }} />
      )}
    </div>
  )
}

/**
 * Tira de barras día por día del mes (la firma del tablero). La altura es lo gastado ese día
 * en gastos comunes y la rayita marca lo que le tocaba: lima si quedó debajo, lila si la pasó.
 * Los días que no llegaron son solo un contorno. Se recorre con las flechas: un solo Tab.
 */
function TiraDiaria({ anio, mes, gastos, obligatorias, semanas, semanasHoy, hoy }: {
  anio: number
  mes: number
  gastos: Gasto[]
  obligatorias: Set<number>
  semanas: SemanaPlan[]
  semanasHoy: SemanaPlan[] | null
  hoy: number | null
}) {
  const montado = useMounted()
  const [foco, setFoco] = useState<number | null>(null)
  const ultimo = new Date(anio, mes, 0).getDate()
  const porDia = Array.from({ length: ultimo + 1 }, () => 0)
  for (const g of gastos) {
    if (g.moneda !== 'ARS' || obligatorias.has(g.categoriaId)) continue
    porDia[Number(g.fecha.slice(8, 10))] += g.monto
  }
  // Lo que le toca a cada día: lo asignado a su semana repartido entre sus días
  const diario = (d: number) => {
    const n = semanaDelDia(d)
    const s = semanasHoy?.find((x) => x.numero === n) ?? semanas[n - 1]
    return Math.max(0, s.asignado / (s.hasta - s.desde + 1))
  }
  const dias = Array.from({ length: ultimo }, (_, i) => i + 1)
  const pasado = (d: number) => hoy === null || d <= hoy
  const escala = Math.max(...dias.map((d) => porDia[d]), ...dias.filter(pasado).map(diario), 1)
  const enfocable = hoy ?? ultimo
  const etiqueta = (d: number) => {
    const dia = new Date(anio, mes - 1, d).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
    return `${dia} ${d}`
  }
  const detalle = (d: number) => {
    const g = porDia[d]
    const tope = diario(d)
    if (!pasado(d)) return `${capitalizar(etiqueta(d))}: todavía no llegó · te tocan ${pesos(tope)}`
    if (g === 0) return `${capitalizar(etiqueta(d))}: sin gastos · te tocaban ${pesos(tope)}`
    return `${capitalizar(etiqueta(d))}: gastaste ${pesos(g)} · ${g > tope ? `${pesos(g - tope)} más de lo del día` : `dentro de los ${pesos(tope)} del día`}`
  }

  function alTecla(e: KeyboardEvent<HTMLDivElement>) {
    const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
    const i = botones.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    const destino = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? botones.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    botones[Math.max(0, Math.min(botones.length - 1, destino))].focus()
  }

  return (
    <div className="mt-auto flex flex-col pt-6">
      <div
        role="group"
        aria-label="Gasto de cada día del mes"
        className="flex h-24 items-end gap-[3px]"
        onPointerLeave={() => setFoco(null)}
        onKeyDown={alTecla}
      >
        {dias.map((d, i) => {
          const g = porDia[d]
          const tope = diario(d)
          const yaPaso = pasado(d)
          const color = g === 0 ? 'var(--muted)' : g > tope ? LILA : LIMA
          const alto = !yaPaso ? 6 : g === 0 ? 6 : Math.max(8, (g / escala) * 100)
          return (
            <div key={d} className="relative flex h-full flex-1 items-end">
              <button
                type="button"
                tabIndex={d === enfocable ? 0 : -1}
                onPointerEnter={() => setFoco(d)}
                onFocus={() => setFoco(d)}
                onBlur={() => setFoco(null)}
                aria-label={detalle(d)}
                aria-current={d === hoy ? 'date' : undefined}
                className={cn(
                  'w-full rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  d === hoy && 'ring-1 ring-foreground/60',
                )}
                style={{
                  height: montado ? `${alto}%` : '6%',
                  background: yaPaso ? color : 'transparent',
                  boxShadow: yaPaso ? undefined : 'inset 0 0 0 1px var(--muted)',
                  opacity: foco === null || foco === d ? 1 : 0.3,
                  transition: `height 900ms ${EASE} ${i * 14}ms, opacity 200ms ease`,
                }}
              />
              {yaPaso && tope > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-[2px] rounded-full bg-foreground/45"
                  style={{ bottom: `${(tope / escala) * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
        <span className="font-mono">1</span>
        <span className="truncate text-foreground" aria-live="polite">
          {foco !== null ? detalle(foco) : 'Gasto de cada día · la rayita es lo que te tocaba'}
        </span>
        <span className="font-mono">{ultimo}</span>
      </div>
    </div>
  )
}

/** Medidor semicircular: el arco lima es lo que queda; lo ya usado se apaga. Lila si te pasaste. */
function MedidorQueda({ queda, total, titulo }: { queda: number; total: number; titulo: string }) {
  const montado = useMounted()
  const usado = total > 0 ? Math.min(1, Math.max(0, (total - queda) / total)) : queda < 0 ? 1 : 0
  const R = 62
  const largo = Math.PI * R
  const mostrado = montado ? usado : 0
  const angulo = -90 + mostrado * 180
  const paso = queda < 0
  const ARCO = 'M 13 78 A 62 62 0 0 1 137 78'
  return (
    <Tile titulo={paso ? titulo.replace('Queda', 'Te pasaste') : titulo}>
      <div className="flex flex-1 flex-col items-center justify-center">
        <svg width="150" height="86" viewBox="0 0 150 86" aria-hidden>
          <path d={ARCO} fill="none" strokeWidth="10" strokeLinecap="round" style={{ stroke: paso ? LILA : LIMA }} />
          {!paso && (
            <path
              d={ARCO}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={largo}
              style={{ stroke: 'var(--muted)', strokeDashoffset: largo * (1 - mostrado), transition: `stroke-dashoffset 900ms ${EASE}` }}
            />
          )}
          <g style={{ transform: `rotate(${angulo}deg)`, transformOrigin: '75px 78px', transition: `transform 900ms ${EASE}` }}>
            <line x1="75" y1="78" x2="75" y2="30" strokeWidth="2.5" strokeLinecap="round" style={{ stroke: 'var(--foreground)' }} />
          </g>
          <circle cx="75" cy="78" r="5" style={{ fill: 'var(--foreground)' }} />
        </svg>
        <Cifra valor={queda} animar className={cn('mt-2 text-[26px] font-semibold leading-none', paso && 'text-secondary')} />
        <p className="mt-1 text-[12px] text-muted-foreground">
          {total > 0 ? `usaste el ${Math.round(usado * 100)}% de lo disponible` : 'sin plata asignada'}
        </p>
      </div>
    </Tile>
  )
}

const ESTADOS: Record<SemanaPlan['estado'], string> = {
  terminada: 'Terminada',
  'en-curso': 'En curso',
  proxima: 'Próxima',
}

function FilaSemana({ semana: s, mes, ocultarAjuste, alCambiarDecision }: {
  semana: SemanaPlan
  mes: number
  /** El ajuste se explica una sola vez al pie cuando varias semanas comparten el mismo */
  ocultarAjuste: boolean
  alCambiarDecision: () => void
}) {
  const notas = [
    !ocultarAjuste && s.ajuste < 0 && `Incluye ${pesos(-s.ajuste)} menos por excesos anteriores.`,
    !ocultarAjuste && s.ajuste > 0 && `Incluye ${pesos(s.ajuste)} más por sobrantes repartidos.`,
    // La semana en curso ya lo dice en el bloque "Esta semana"
    s.estado !== 'en-curso' && s.descuentoPorSemanaSiguiente > 0 && `Se descuentan ${pesos(s.descuentoPorSemanaSiguiente)} de cada semana siguiente.`,
  ].filter(Boolean)
  const proxima = s.estado === 'proxima' && s.gastado === 0
  const colorEstado = s.saldo < 0 && !proxima ? LILA : s.estado === 'en-curso' ? LIMA : 'var(--muted-foreground)'
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[14px] font-semibold">Semana {s.numero}</h3>
        <span className="text-[12px] text-muted-foreground">{s.desde} al {s.hasta} de {nombreMes(mes)}</span>
        <span className="ml-auto">
          <Insignia color={colorEstado}>{ESTADOS[s.estado]}</Insignia>
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <span className="block text-[12px] text-muted-foreground">Para gastar</span>
          <Cifra valor={s.asignado} className="text-[18px] font-semibold" />
        </div>
        {!proxima && (
          <>
            <div>
              <span className="block text-[12px] text-muted-foreground">Gastado</span>
              <Cifra valor={s.gastado} className="text-[18px] font-semibold" />
            </div>
            <div className="text-right">
              <span className="block text-[12px] text-muted-foreground">{s.saldo >= 0 ? (s.estado === 'terminada' ? 'Sobró' : 'Queda') : 'Te pasaste'}</span>
              <Cifra valor={s.saldo} className={cn('text-[18px] font-semibold', s.saldo < 0 && 'text-secondary')} />
            </div>
          </>
        )}
      </div>
      {!proxima && <BarraUso asignado={s.asignado} gastado={s.gastado} className="mt-2 h-1.5" />}
      {notas.length > 0 && <p className="mt-1.5 text-[12px] text-muted-foreground">{notas.join(' ')}</p>}
      {s.decision && s.estado === 'terminada' && s.saldo > 0 && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {s.decision === 'Ahorrar' ? `Guardaste ${pesos(s.saldo)} como ahorro.` : `Repartiste ${pesos(s.saldo)} entre las semanas siguientes.`}{' '}
          <button type="button" className="font-semibold text-primary hover:underline" onClick={alCambiarDecision}>Cambiar</button>
        </p>
      )}
    </li>
  )
}

/** En qué se va la plata del mes: barra segmentada por categoría */
function Categorias({ gastos }: { gastos: Gasto[] }) {
  const montado = useMounted()
  const [foco, setFoco] = useState<number | null>(null)
  const porCategoria = new Map<number, { nombre: string; color: string; total: number }>()
  for (const g of gastos) {
    if (g.moneda !== 'ARS') continue
    const c = porCategoria.get(g.categoriaId) ?? { nombre: g.categoriaNombre, color: g.categoriaColor, total: 0 }
    c.total += g.monto
    porCategoria.set(g.categoriaId, c)
  }
  const lista = [...porCategoria.values()].sort((a, b) => b.total - a.total)
  const total = lista.reduce((s, c) => s + c.total, 0)

  return (
    <Tile titulo="En qué se va" accion={<Link to="/resumen" className="text-[12px] font-semibold text-primary hover:underline">Ver resumen</Link>}>
      {total === 0 ? (
        <p className="text-[13px] text-muted-foreground">Todavía no hay gastos este mes.</p>
      ) : (
        <>
          <Cifra valor={total} className="text-[22px] font-semibold" />
          <div className="mt-4 flex h-9 gap-1" onPointerLeave={() => setFoco(null)} aria-hidden>
            {lista.map((c, i) => (
              <span
                key={c.nombre}
                onPointerEnter={() => setFoco(i)}
                className="min-w-[4px] rounded-[8px]"
                style={{
                  flexBasis: montado ? `${(c.total / total) * 100}%` : `${100 / lista.length}%`,
                  background: c.color,
                  opacity: foco === null || foco === i ? 1 : 0.3,
                  transition: `flex-basis 1000ms ${EASE} ${200 + i * 60}ms, opacity 200ms ease`,
                }}
              />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-y-1.5">
            {lista.slice(0, 5).map((c, i) => (
              <li
                key={c.nombre}
                className="flex items-center justify-between gap-2 text-[12px]"
                onPointerEnter={() => setFoco(i)}
                onPointerLeave={() => setFoco(null)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                  <span className="truncate">{c.nombre}</span>
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">{((c.total / total) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tile>
  )
}

/** Bloque lima: lo ahorrado y la decisión pendiente sobre el sobrante de una semana */
function Ahorro({ ahorrado, pendiente, otrasPendientes, mes, semanas, alDecidir }: {
  ahorrado: number
  pendiente: SemanaPlan | null
  otrasPendientes: number
  mes: number
  semanas: SemanaPlan[]
  alDecidir: (semana: number, decision: Decision) => void
}) {
  const tinta = 'var(--primary-foreground)'
  const decididas = semanas.filter((s) => s.estado === 'terminada' && s.saldo > 0 && s.decision)
  return (
    <section
      aria-labelledby="titulo-ahorro"
      className="relative flex min-w-0 flex-col overflow-hidden rounded-tile bg-primary p-5 lg:row-span-2"
      style={{ color: tinta }}
    >
      <header className="flex items-center justify-between">
        <h2 id="titulo-ahorro" className="text-[13px] font-semibold opacity-75">Ahorro del mes</h2>
        {pendiente && (
          <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'oklch(0.24 0.06 135 / 0.12)' }}>
            <span className="size-1.5 rounded-full" style={{ background: tinta }} aria-hidden />
            Para decidir
          </span>
        )}
      </header>

      <Cifra valor={ahorrado} animar className="mt-5 text-[46px] font-semibold leading-none tracking-[-0.05em]" simboloClassName="text-current opacity-60" />
      <p className="mt-1 text-[12px] font-medium opacity-70">guardado en {nombreMes(mes)}</p>

      {pendiente ? (
        <div className="mt-5 rounded-2xl p-3" style={{ background: 'oklch(0.24 0.06 135 / 0.1)' }} role="status">
          <p className="text-[13px] font-semibold">
            Te sobraron {pesos(pendiente.saldo)} de la semana {pendiente.numero}
          </p>
          <p className="mt-0.5 text-[12px] opacity-75">Del {pendiente.desde} al {pendiente.hasta}: ¿qué hacemos con esa plata?</p>
          {otrasPendientes > 0 && (
            <p className="mt-1 text-[11px] opacity-70">Después, {otrasPendientes === 1 ? 'queda 1 semana más' : `quedan ${otrasPendientes} semanas más`} por decidir.</p>
          )}
        </div>
      ) : (
        <p className="mt-5 text-[12px] opacity-75">
          Cuando una semana termina con plata de sobra, acá elegís si la guardás o la sumás a las semanas que quedan.
        </p>
      )}

      {decididas.length > 0 && (
        <dl className="mt-4 space-y-1 text-[12px]">
          {decididas.map((s) => (
            <div key={s.numero} className="flex justify-between gap-2">
              <dt className="opacity-70">Semana {s.numero} · {s.decision === 'Ahorrar' ? 'ahorrado' : 'repartido'}</dt>
              <dd className="font-mono font-semibold tabular-nums">{pesos(s.saldo)}</dd>
            </div>
          ))}
        </dl>
      )}

      {pendiente && (
        <div className="mt-auto flex flex-col gap-2 pt-6">
          <button
            type="button"
            onClick={() => alDecidir(pendiente.numero, 'Ahorrar')}
            className="w-full rounded-2xl py-3 text-sm font-semibold outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[var(--primary-foreground)] focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:scale-[0.98]"
            style={{ background: tinta, color: 'var(--primary)' }}
          >
            Guardar como ahorro
          </button>
          {pendiente.numero < 4 && (
            <button
              type="button"
              onClick={() => alDecidir(pendiente.numero, 'Repartir')}
              className="w-full rounded-2xl border py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-foreground)]"
              style={{ borderColor: 'oklch(0.24 0.06 135 / 0.35)' }}
            >
              Sumar a las semanas que quedan
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function UltimosGastos({ gastos, alEditar }: { gastos: Gasto[]; alEditar: (g: Gasto) => void }) {
  const montado = useMounted()
  const ultimos = [...gastos].sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1)).slice(0, 5)
  return (
    <Tile
      titulo="Últimos gastos"
      className="sm:col-span-2 lg:col-span-2"
      accion={<Link to="/gastos" className="text-[12px] font-semibold text-primary hover:underline">Ver todos</Link>}
    >
      {ultimos.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Todavía no cargaste gastos este mes. Apretá N para cargar uno.</p>
      ) : (
        <ul className="-mx-2 -my-1">
          {ultimos.map((g, i) => (
            <li
              key={g.id}
              style={{ opacity: montado ? 1 : 0, transform: montado ? 'none' : 'translateY(6px)', transition: `opacity 500ms ease ${200 + i * 60}ms, transform 500ms ${EASE} ${200 + i * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => alEditar(g)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                  <span className="size-2.5 rounded-full" style={{ background: g.categoriaColor }} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{g.descripcion || g.categoriaNombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {g.categoriaNombre} · {Number(g.fecha.slice(8, 10))} de {nombreMes(Number(g.fecha.slice(5, 7)))}
                  </span>
                </span>
                <span className="font-mono text-[13px] font-medium tabular-nums">{formatearMonto(g.monto, g.moneda)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tile>
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
    <Tile titulo="Gastos obligatorios" className="sm:col-span-2 lg:col-span-4">
      <p className="text-lg font-semibold tracking-tight">¿Qué gastos no podés evitar?</p>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
        Marcá las categorías obligatorias, como alquiler, servicios, suscripciones o tarjeta.
        {primeraVez && ' Lo que pagues en ellas se descuenta del plan y el resto de tus ingresos se reparte entre las semanas.'}
      </p>
      <div className="chips mt-4">
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
      {error && <p className="error mt-3" role="alert">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="boton boton--primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar categorías'}
        </button>
        {alCancelar && <button type="button" className="boton-texto" onClick={alCancelar}>Cancelar</button>}
      </div>
    </Tile>
  )
}
