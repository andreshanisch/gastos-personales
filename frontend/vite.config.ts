import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Si se publica en GitHub Pages bajo /gastos-personales/, se define BASE_PATH en el build
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mis gastos',
        short_name: 'Gastos',
        description: 'Registro personal de gastos mensuales',
        lang: 'es-AR',
        theme_color: '#2F5D50',
        background_color: '#EEF2F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La API nunca se cachea: los datos siempre vienen frescos del servidor
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
