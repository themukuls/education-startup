import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works from a static host and from the
// file:// context Capacitor uses when wrapping the app for iOS / Android.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // dev: forward API calls to the local backend (npm run server)
      '/api': 'http://localhost:8787',
    },
  },
})
