import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'BitácoraAR',
        short_name: 'BitácoraAR',
        description: 'Registro de viajes de pesca de altura para tripulantes argentinos',
        theme_color: '#0d1630',
        background_color: '#0a0f1e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: 'any',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
          },
        ],
      },
    }),
  ],
})
