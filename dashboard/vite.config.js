import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/classifyner': {
        target: 'http://localhost:3737',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3737',
        changeOrigin: true,
      },
    },
  },
})
