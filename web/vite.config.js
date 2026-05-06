import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IIHF 2026 Tipovačka',
        short_name: 'IIHF2026',
        description: 'Tipovačka MS v ľadovom hokeji 2026',
        theme_color: '#1a3a6b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/logo.png',    sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
