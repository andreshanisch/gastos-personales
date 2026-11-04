import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router'
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
        <div className="app">
          <nav className="navegacion" aria-label="Secciones">
            <span className="navegacion__marca">
              <img src="/icon.svg" alt="" width="28" height="28" />
              Mis gastos
            </span>
            <NavLink to="/" end className="navegacion__enlace">
              <IconoPlan />
              Plan
            </NavLink>
            <NavLink to="/gastos" className="navegacion__enlace">
              <IconoLista />
              Gastos
            </NavLink>
            <NavLink to="/ingresos" className="navegacion__enlace">
              <IconoIngreso />
              Ingresos
            </NavLink>
            <NavLink to="/resumen" className="navegacion__enlace">
              <IconoBarras />
              Resumen
            </NavLink>
            <NavLink to="/historial" className="navegacion__enlace">
              <IconoHistorial />
              Historial
            </NavLink>
            <NavLink to="/categorias" className="navegacion__enlace">
              <IconoEtiqueta />
              Categorías
            </NavLink>
          </nav>
          <main className="contenido">
            <Routes>
              <Route path="/" element={<PlanPage />} />
              <Route path="/gastos" element={<GastosPage />} />
              <Route path="/buscar" element={<BuscarPage />} />
              <Route path="/ingresos" element={<IngresosPage />} />
              <Route path="/resumen" element={<ResumenPage />} />
              <Route path="/historial" element={<HistorialPage />} />
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </MesProvider>
    </HashRouter>
  )
}

const propsIcono = {
  width: 20, height: 20, viewBox: '0 0 22 22', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

function IconoPlan() {
  return <svg {...propsIcono}><rect x="3" y="4" width="16" height="15" rx="2" /><path d="M3 9h16M8 2.5v3M14 2.5v3" /></svg>
}
function IconoLista() {
  return <svg {...propsIcono}><path d="M7 6h11M7 11h11M7 16h11" /><circle cx="3.5" cy="6" r=".6" /><circle cx="3.5" cy="11" r=".6" /><circle cx="3.5" cy="16" r=".6" /></svg>
}
function IconoIngreso() {
  return <svg {...propsIcono}><path d="M11 18V5M5.5 10.5 11 5l5.5 5.5" /></svg>
}
function IconoBarras() {
  return <svg {...propsIcono}><path d="M3 6h9M3 11h15M3 16h6" /></svg>
}
function IconoHistorial() {
  return <svg {...propsIcono}><path d="M4 18V11M9 18V6M14 18v-9M19 18V4" /></svg>
}
function IconoEtiqueta() {
  return <svg {...propsIcono}><path d="M3 3h7.5l8.5 8.5-7.5 7.5L3 10.5z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
}
