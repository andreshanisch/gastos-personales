import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router'
import { leerSesion, logout, onSesionExpirada } from './api'
import { MesProvider } from './MesContext'
import { CategoriasPage } from './pages/CategoriasPage'
import { GastosPage } from './pages/GastosPage'
import { LoginPage } from './pages/LoginPage'
import { ResumenPage } from './pages/ResumenPage'

export function App() {
  const [logueado, setLogueado] = useState(() => leerSesion() !== null)

  useEffect(() => {
    onSesionExpirada(() => setLogueado(false))
  }, [])

  if (!logueado) return <LoginPage alIngresar={() => setLogueado(true)} />

  return (
    // HashRouter: las rutas funcionan en cualquier hosting estático sin configuración extra
    <HashRouter>
      <MesProvider>
        <div className="app">
          <nav className="navegacion" aria-label="Secciones">
            <NavLink to="/" end className="navegacion__enlace">
              <IconoLista />
              Gastos
            </NavLink>
            <NavLink to="/resumen" className="navegacion__enlace">
              <IconoBarras />
              Resumen
            </NavLink>
            <NavLink to="/categorias" className="navegacion__enlace">
              <IconoEtiqueta />
              Categorías
            </NavLink>
          </nav>
          <main className="contenido">
            <Routes>
              <Route path="/" element={<GastosPage />} />
              <Route path="/resumen" element={<ResumenPage />} />
              <Route
                path="/categorias"
                element={<CategoriasPage alCerrarSesion={() => { logout(); setLogueado(false) }} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </MesProvider>
    </HashRouter>
  )
}

const propsIcono = {
  width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

function IconoLista() {
  return <svg {...propsIcono}><path d="M7 6h11M7 11h11M7 16h11" /><circle cx="3.5" cy="6" r=".6" /><circle cx="3.5" cy="11" r=".6" /><circle cx="3.5" cy="16" r=".6" /></svg>
}
function IconoBarras() {
  return <svg {...propsIcono}><path d="M3 6h9M3 11h15M3 16h6" /></svg>
}
function IconoEtiqueta() {
  return <svg {...propsIcono}><path d="M3 3h7.5l8.5 8.5-7.5 7.5L3 10.5z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
}
