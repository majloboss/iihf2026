import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isDev = (process.env.VITE_API_URL || '').includes('dev_');

export default defineConfig({
  plugins: [
    react(),

    // Na dev a produkcii je otvorena ta ista appka a v zalozkach prehliadaca
    // sa nedali rozoznat. Dev verzia preto dostane favicon so zelenym
    // pozadim — rovnakou zelenou, aku ma dev PWA ikona.
    //
    // index.html ma favicon natvrdo, takze sa prepisuje az pri builde.
    // Vyrobit dev variantu: python tools/gen_favicon_dev.py
    {
      name: 'dev-favicon',
      transformIndexHtml(html) {
        return isDev ? html.replace('/favicon.png', '/favicon-dev.png') : html;
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      // Registraciu si robi main.jsx sam, aby sa dal nastavit updateViaCache.
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
      manifest: {
        name: isDev ? 'BetClub DEV' : 'BetClub',
        short_name: isDev ? 'BetClub DEV' : 'BetClub',
        description: 'Tipovačka športových zápasov pre teba a tvojich kamošov',
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
