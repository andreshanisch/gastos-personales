import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router'
import { AccionesProvider, useAcciones } from './Acciones'
import { AvisosProvider } from './components/Avisos'
import { ConfirmarProvider } from './components/Confirmar'
import { MesProvider } from './MesContext'
import { BuscarPage } from './pages/BuscarPage'
import { CategoriasPage } from './pages/CategoriasPage'
import { GastosPage } from './pages/GastosPage'
import { HistorialPage } from './pages/HistorialPage'
import { IngresosPage } from './pages/IngresosPage'
import { PlanPage } from './pages/PlanPage'
import { ResumenPage } from './pages/ResumenPage'

export function App() {
  return (
    <HashRouter>
      <MesProvider>
        <AvisosProvider>
          <ConfirmarProvider>
            <AccionesProvider>
              <div className="app">
                <BarraLateral />
                <main className="contenido" id="contenido">
                  <Routes>
                    <Route path="/" element={<PlanPage />} />
                    <Route path="/gastos" element={<GastosPage />} />
                    <Route path="/ingresos" element={<IngresosPage />} />
                    <Route path="/resumen" element={<ResumenPage />} />
                    <Route path="/historial" element={<HistorialPage />} />
                    <Route path="/buscar" element={<BuscarPage />} />
                    <Route path="/categorias" element={<CategoriasPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </AccionesProvider>
          </ConfirmarProvider>
        </AvisosProvider>
      </MesProvider>
    </HashRouter>
  )
}

const GRUPOS = [
  {
    nombre: 'Este mes',
    enlaces: [
      { a: '/', texto: 'Plan', icono: <IconoPlan />, fin: true },
      { a: '/gastos', texto: 'Gastos', icono: <IconoGastos /> },
      { a: '/ingresos', texto: 'Ingresos', icono: <IconoIngresos /> },
      { a: '/resumen', texto: 'Resumen', icono: <IconoResumen /> },
    ],
  },
  {
    nombre: 'Análisis',
    enlaces: [
      { a: '/historial', texto: 'Historial', icono: <IconoHistorial /> },
      { a: '/buscar', texto: 'Buscar', icono: <IconoBuscar /> },
    ],
  },
  {
    nombre: 'Ajustes',
    enlaces: [{ a: '/categorias', texto: 'Categorías', icono: <IconoCategorias /> }],
  },
]

function BarraLateral() {
  const { nuevoGasto, nuevoIngreso } = useAcciones()
  return (
    <aside className="lateral">
      <a href="#contenido" className="saltar">Ir al contenido</a>
      <div className="lateral__marca">
        <img src="/icon.svg" alt="" width="34" height="34" />
        <span>Mis gastos</span>
      </div>

      <div className="lateral__acciones">
        <button type="button" className="boton boton--primario boton--ancho lateral__nuevo" onClick={nuevoGasto}>
          <IconoMas />
          Nuevo gasto
          <kbd title="Atajo de teclado">N</kbd>
        </button>
        <button type="button" className="boton boton--secundario boton--ancho lateral__nuevo" onClick={nuevoIngreso}>
          <IconoMas />
          Nuevo ingreso
          <kbd title="Atajo de teclado">I</kbd>
        </button>
      </div>

      <nav className="lateral__nav" aria-label="Secciones">
        {GRUPOS.map((g) => (
          <div key={g.nombre} className="lateral__grupo">
            <p className="lateral__grupo-nombre">{g.nombre}</p>
            <ul>
              {g.enlaces.map((e) => (
                <li key={e.a}>
                  <NavLink to={e.a} end={e.fin} className="lateral__enlace">
                    {e.icono}
                    {e.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

const propsIcono = {
  width: 20, height: 20, viewBox: '0 0 22 22', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

function IconoMas() {
  return <svg {...propsIcono} width={18} height={18} strokeWidth={2.2}><path d="M11 4.5v13M4.5 11h13" /></svg>
}
function IconoPlan() {
  return <svg {...propsIcono}><rect x="3" y="4.5" width="16" height="14" rx="2.5" /><path d="M3 9.5h16M7.5 2.5v4M14.5 2.5v4M7 13.5h3" /></svg>
}
function IconoGastos() {
  return <svg {...propsIcono}><path d="M5 3.5h12v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" /><path d="M8 8h6M8 11.5h6" /></svg>
}
function IconoIngresos() {
  return <svg {...propsIcono}><path d="M11 17.5V5M6 10l5-5 5 5" /><path d="M4 19.5h14" /></svg>
}
function IconoResumen() {
  return <svg {...propsIcono}><path d="M11 3a8 8 0 1 0 8 8h-8z" /><path d="M14 2.8A8 8 0 0 1 19.2 8H14z" /></svg>
}
function IconoHistorial() {
  return <svg {...propsIcono}><path d="M4 18.5V12M9 18.5V7M14 18.5v-9M19 18.5V4" /></svg>
}
function IconoBuscar() {
  return <svg {...propsIcono}><circle cx="9.5" cy="9.5" r="6" /><path d="m14 14 5 5" /></svg>
}
function IconoCategorias() {
  return <svg {...propsIcono}><path d="M3 3h7.5l8.5 8.5-7.5 7.5L3 10.5z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
}
