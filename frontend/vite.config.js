import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://adresse ipv4 de votre réseau:5000',
        changeOrigin: true,
        secure: false,
      }
    },
    optimizeDeps: {
      include: ['@fullcalendar/core']
    },
    build: {
      rollupOptions: {
        external: [
          '@fullcalendar/core',
          '@fullcalendar/core/index.js',
          '@fullcalendar/core/internal.js',
          '@fullcalendar/core/preact.js',
          '@fullcalendar/core/internal'
        ]
      }
    }
  }
})