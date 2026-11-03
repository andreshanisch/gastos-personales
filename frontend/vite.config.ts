import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // La página compilada la sirve la API desde wwwroot: todo queda en http://localhost:5080
    outDir: '../backend/Gastos.Api/wwwroot',
    emptyOutDir: true,
  },
  server: {
    // En desarrollo (npm run dev) los pedidos a /api se reenvían a la API
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
})
