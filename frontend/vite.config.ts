import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/ui/..." apunta a src/components/ui/... (estructura de shadcn)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
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
