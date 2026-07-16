import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5223,
    proxy: {
      '/api': {
        target: 'http://localhost:5223',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})