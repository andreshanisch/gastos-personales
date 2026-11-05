import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// En el teléfono (fuera de localhost) se guarda la app para que abra con la compu apagada
if ('serviceWorker' in navigator && import.meta.env.PROD && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* sin service worker la app anda igual, solo sin modo sin conexión */ })
  })
}
