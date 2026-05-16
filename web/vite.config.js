import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isDev = (process.env.VITE_API_URL || '').includes('dev_');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
      manifest: {
        name: isDev ? 'IIHF 2026 DEV' : 'IIHF 2026 Tipovačka',
        short_name: isDev ? 'IIHF DEV' : 'IIHF2026',
        description: 'Tipovačka MS v ľadovom hokeji 2026',
        theme_color: isDev ? '#28a745' : '#1a3a6b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: isDev ? '/icon-192-dev.png' : '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: isDev ? '/icon-512-dev.png' : '/icon-512.png', sizes: '512x512', type: 'image/png' }
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
